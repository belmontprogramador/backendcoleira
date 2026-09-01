import { Inject, Injectable } from '@nestjs/common'
import { NFC_TAG_REPOSITORY_PORT } from '../../domain/repositories/nfc-tag.repository.port'
import type { NfcTagRepositoryPort } from '../../domain/repositories/nfc-tag.repository.port'
import { BATCH_REPOSITORY_PORT } from '../../domain/repositories/batch.repository.port'
import type { BatchRepositoryPort } from '../../domain/repositories/batch.repository.port'
import { NFC_WRITER_PORT } from '../../domain/services/nfc-writer.port'
import type { NfcWriterPort } from '../../domain/services/nfc-writer.port'
import { NFC_READER_PORT } from '../../domain/services/nfc-reader.port'
import type { NfcReaderPort } from '../../domain/services/nfc-reader.port'
import { PUBLIC_BASE_URL_PORT } from '../../domain/services/public-base-url.port'
import type { PublicBaseUrlPort } from '../../domain/services/public-base-url.port'
import { AUDIT_LOGGER_PORT } from '../../../../common/ports/audit-logger.port'
import type { AuditLoggerPort } from '../../../../common/ports/audit-logger.port'
import type { NfcTag } from '../../domain/entities/nfc-tag.entity'
import { Uid } from '../../domain/value-objects/uid.vo'
import {
  TagNotFoundError,
  DuplicateUidError,
  WriteNfcFailedError,
} from '../errors'

const MAX_ATTEMPTS = 3

/**
 * Caso de uso: gravar NFC (operação de produção, exclusiva de OPERATOR).
 *
 * A autorização (`tag:record`) é imposta na rota. O fluxo obrigatório é
 * write→read→compare (doc-sistema §producao-fabricacao §3), com retry até 3x.
 */
@Injectable()
export class WriteNfcUseCase {
  constructor(
    @Inject(NFC_TAG_REPOSITORY_PORT)
    private readonly tags: NfcTagRepositoryPort,
    @Inject(BATCH_REPOSITORY_PORT)
    private readonly batches: BatchRepositoryPort,
    @Inject(NFC_WRITER_PORT) private readonly writer: NfcWriterPort,
    @Inject(NFC_READER_PORT) private readonly reader: NfcReaderPort,
    @Inject(PUBLIC_BASE_URL_PORT) private readonly baseUrl: PublicBaseUrlPort,
    @Inject(AUDIT_LOGGER_PORT) private readonly audit: AuditLoggerPort,
  ) {}

  async execute(
    operatorId: string,
    publicId: string,
    uidValue: string,
  ): Promise<NfcTag> {
    const tag = await this.tags.findByPublicId(publicId)
    if (!tag) {
      throw new TagNotFoundError(publicId)
    }

    const uid = Uid.create(uidValue)

    const existingUid = await this.tags.findByUid(uid.value)
    if (existingUid && existingUid.id !== tag.id) {
      throw new DuplicateUidError(uid.value)
    }

    const url = this.baseUrl.buildProfileUrl(tag.publicId.value)

    let success = false
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const wrote = await this.writer.write(uid.value, url)
      if (!wrote) {
        continue
      }
      const read = await this.reader.read(uid.value)
      if (read === url) {
        success = true
        break
      }
    }

    if (!success) {
      if (tag.batchId) {
        const batch = await this.batches.findById(tag.batchId)
        if (batch) {
          batch.incrementFailed()
          await this.batches.save(batch)
        }
      }
      await this.audit.log({
        action: 'tag_write_failed',
        entity: 'nfc_tag',
        entityId: tag.id,
        metadata: { publicId, attempts: MAX_ATTEMPTS },
      })
      throw new WriteNfcFailedError(publicId, MAX_ATTEMPTS)
    }

    tag.markWritten(uid)
    await this.tags.save(tag)

    if (tag.batchId) {
      const batch = await this.batches.findById(tag.batchId)
      if (batch) {
        batch.ensureWriting()
        batch.incrementWritten()
        await this.batches.save(batch)
      }
    }

    await this.audit.log({
      action: 'tag_write',
      entity: 'nfc_tag',
      entityId: tag.id,
      metadata: { publicId, operatorId },
    })

    return tag
  }
}
