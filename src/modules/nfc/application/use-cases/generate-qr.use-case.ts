import { Inject, Injectable } from '@nestjs/common'
import { NFC_TAG_REPOSITORY_PORT } from '../../domain/repositories/nfc-tag.repository.port'
import type { NfcTagRepositoryPort } from '../../domain/repositories/nfc-tag.repository.port'
import { QR_GENERATOR_PORT } from '../../domain/services/qr-generator.port'
import type { QrGeneratorPort } from '../../domain/services/qr-generator.port'
import { PUBLIC_BASE_URL_PORT } from '../../domain/services/public-base-url.port'
import type { PublicBaseUrlPort } from '../../domain/services/public-base-url.port'
import { AUDIT_LOGGER_PORT } from '../../../../common/ports/audit-logger.port'
import type { AuditLoggerPort } from '../../../../common/ports/audit-logger.port'
import { TagNotFoundError } from '../errors'

export interface GenerateQrResult {
  publicId: string
  url: string
  png: Buffer
}

/**
 * Caso de uso: gerar o QR Code de um pingente (mesma URL do NFC).
 */
@Injectable()
export class GenerateQrUseCase {
  constructor(
    @Inject(NFC_TAG_REPOSITORY_PORT)
    private readonly tags: NfcTagRepositoryPort,
    @Inject(QR_GENERATOR_PORT) private readonly qrGen: QrGeneratorPort,
    @Inject(PUBLIC_BASE_URL_PORT) private readonly baseUrl: PublicBaseUrlPort,
    @Inject(AUDIT_LOGGER_PORT) private readonly audit: AuditLoggerPort,
  ) {}

  async execute(publicId: string): Promise<GenerateQrResult> {
    const tag = await this.tags.findByPublicId(publicId)
    if (!tag) {
      throw new TagNotFoundError(publicId)
    }

    const url = this.baseUrl.buildProfileUrl(publicId)
    const png = await this.qrGen.generatePng(url)

    await this.audit.log({
      action: 'qr_generate',
      entity: 'nfc_tag',
      entityId: tag.id,
      metadata: { publicId },
    })

    return { publicId, url, png }
  }
}
