import { Inject, Injectable } from '@nestjs/common'
import { NFC_TAG_REPOSITORY_PORT } from '../../domain/repositories/nfc-tag.repository.port'
import type { NfcTagRepositoryPort } from '../../domain/repositories/nfc-tag.repository.port'
import { NFC_READER_PORT } from '../../domain/services/nfc-reader.port'
import type { NfcReaderPort } from '../../domain/services/nfc-reader.port'
import { PUBLIC_BASE_URL_PORT } from '../../domain/services/public-base-url.port'
import type { PublicBaseUrlPort } from '../../domain/services/public-base-url.port'
import { AUDIT_LOGGER_PORT } from '../../../../common/ports/audit-logger.port'
import type { AuditLoggerPort } from '../../../../common/ports/audit-logger.port'
import { TagNotFoundError } from '../errors'

export interface VerifyNfcResult {
  ok: boolean
  publicId: string
}

/**
 * Caso de uso: verificar se a URL gravada no chip coincide com a esperada.
 * (write→read→compare re-executado sob demanda).
 */
@Injectable()
export class VerifyNfcUseCase {
  constructor(
    @Inject(NFC_TAG_REPOSITORY_PORT)
    private readonly tags: NfcTagRepositoryPort,
    @Inject(NFC_READER_PORT) private readonly reader: NfcReaderPort,
    @Inject(PUBLIC_BASE_URL_PORT) private readonly baseUrl: PublicBaseUrlPort,
    @Inject(AUDIT_LOGGER_PORT) private readonly audit: AuditLoggerPort,
  ) {}

  async execute(publicId: string, uid?: string): Promise<VerifyNfcResult> {
    const tag = await this.tags.findByPublicId(publicId)
    if (!tag) {
      throw new TagNotFoundError(publicId)
    }

    const readUid = uid ?? tag.uid?.value
    if (!readUid) {
      return { ok: false, publicId }
    }

    const readUrl = await this.reader.read(readUid)
    const expected = this.baseUrl.buildProfileUrl(publicId)
    const ok = readUrl === expected

    await this.audit.log({
      action: 'tag_verify',
      entity: 'nfc_tag',
      entityId: tag.id,
      metadata: { ok },
    })

    return { ok, publicId }
  }
}
