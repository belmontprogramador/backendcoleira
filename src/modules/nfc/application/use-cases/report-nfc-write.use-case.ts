import { Inject, Injectable } from '@nestjs/common'
import { NFC_TAG_REPOSITORY_PORT } from '../../domain/repositories/nfc-tag.repository.port'
import type { NfcTagRepositoryPort } from '../../domain/repositories/nfc-tag.repository.port'
import { BATCH_REPOSITORY_PORT } from '../../domain/repositories/batch.repository.port'
import type { BatchRepositoryPort } from '../../domain/repositories/batch.repository.port'
import { AUDIT_LOGGER_PORT } from '../../../../common/ports/audit-logger.port'
import type { AuditLoggerPort } from '../../../../common/ports/audit-logger.port'
import type { NfcTag } from '../../domain/entities/nfc-tag.entity'
import { Uid } from '../../domain/value-objects/uid.vo'
import {
  TagNotFoundError,
  DuplicateUidError,
  WriteNfcFailedError,
} from '../errors'

/**
 * Caso de uso: reportar a gravação feita pelo celular (Web NFC).
 *
 * O backend não segura o hardware — o celular do operador grava e lê de volta,
 * reportando `matched` (a URL lida coincide com a esperada). O backend confia
 * no resultado (operador autenticado + `tag:record`). Permissão `tag:record`.
 */
@Injectable()
export class ReportNfcWriteUseCase {
  constructor(
    @Inject(NFC_TAG_REPOSITORY_PORT)
    private readonly tags: NfcTagRepositoryPort,
    @Inject(BATCH_REPOSITORY_PORT)
    private readonly batches: BatchRepositoryPort,
    @Inject(AUDIT_LOGGER_PORT) private readonly audit: AuditLoggerPort,
  ) {}

  async execute(
    operatorId: string,
    publicId: string,
    uidValue: string | undefined,
    matched: boolean,
  ): Promise<NfcTag> {
    const tag = await this.tags.findByPublicId(publicId)
    if (!tag) {
      throw new TagNotFoundError(publicId)
    }

    let uid: Uid | null = null
    if (uidValue) {
      uid = Uid.create(uidValue)

      const existingUid = await this.tags.findByUid(uid.value)
      if (existingUid && existingUid.id !== tag.id) {
        throw new DuplicateUidError(uid.value)
      }
    }

    if (!matched) {
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
        metadata: { publicId, matched },
      })
      throw new WriteNfcFailedError(publicId, 1)
    }

    if (uid) {
      tag.markWritten(uid)
    } else {
      tag.markWrittenWithoutUid()
    }
    await this.tags.save(tag)

    if (tag.batchId) {
      const batch = await this.batches.findById(tag.batchId)
      if (batch) {
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
