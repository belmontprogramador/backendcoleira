import { Inject, Injectable } from '@nestjs/common'
import { BATCH_REPOSITORY_PORT } from '../../domain/repositories/batch.repository.port'
import type { BatchRepositoryPort } from '../../domain/repositories/batch.repository.port'
import { NFC_TAG_REPOSITORY_PORT } from '../../domain/repositories/nfc-tag.repository.port'
import type { NfcTagRepositoryPort } from '../../domain/repositories/nfc-tag.repository.port'
import { ACTIVATION_CODE_CIPHER_PORT } from '../../domain/services/activation-code-cipher.port'
import type { ActivationCodeCipherPort } from '../../domain/services/activation-code-cipher.port'
import { QR_GENERATOR_PORT } from '../../domain/services/qr-generator.port'
import type { QrGeneratorPort } from '../../domain/services/qr-generator.port'
import { PUBLIC_BASE_URL_PORT } from '../../domain/services/public-base-url.port'
import type { PublicBaseUrlPort } from '../../domain/services/public-base-url.port'
import { CARD_SHEET_PDF_PORT } from '../../domain/services/card-sheet-pdf.port'
import type {
  CardSheetLabel,
  CardSheetPdfPort,
} from '../../domain/services/card-sheet-pdf.port'
import { AUDIT_LOGGER_PORT } from '../../../../common/ports/audit-logger.port'
import type { AuditLoggerPort } from '../../../../common/ports/audit-logger.port'
import { BatchEmptyError, BatchNotFoundError } from '../errors'

/** Resolução do QR para impressão (≈ 4cm a 325dpi). */
const QR_PIXEL_SIZE = 512

export interface GenerateBatchSheetResult {
  pdf: Buffer
  filename: string
  count: number
}

/**
 * Caso de uso: gerar a folha A4 (PDF) de um lote — QR + código de ativação.
 *
 * Regenerável sob demanda (requisito 1.5): o QR deriva de `publicId` e o código
 * é recuperável via `cipher.decrypt`. Nada é persistido; os códigos em texto
 * puro vivem **somente em memória** durante a geração (nunca logados).
 * Permissão `tag:write` (OPERATOR, ADMIN) — revela códigos.
 */
@Injectable()
export class GenerateBatchSheetUseCase {
  constructor(
    @Inject(BATCH_REPOSITORY_PORT)
    private readonly batches: BatchRepositoryPort,
    @Inject(NFC_TAG_REPOSITORY_PORT)
    private readonly tags: NfcTagRepositoryPort,
    @Inject(ACTIVATION_CODE_CIPHER_PORT)
    private readonly cipher: ActivationCodeCipherPort,
    @Inject(QR_GENERATOR_PORT) private readonly qrGen: QrGeneratorPort,
    @Inject(PUBLIC_BASE_URL_PORT) private readonly baseUrl: PublicBaseUrlPort,
    @Inject(CARD_SHEET_PDF_PORT) private readonly sheet: CardSheetPdfPort,
    @Inject(AUDIT_LOGGER_PORT) private readonly audit: AuditLoggerPort,
  ) {}

  async execute(
    operatorId: string,
    batchId: string,
  ): Promise<GenerateBatchSheetResult> {
    const batch = await this.batches.findById(batchId)
    if (!batch) {
      throw new BatchNotFoundError(batchId)
    }

    const tags = await this.tags.listByBatch(batchId)
    if (tags.length === 0) {
      throw new BatchEmptyError(batchId)
    }

    const labels: CardSheetLabel[] = []
    for (const tag of tags) {
      const code = this.cipher.decrypt(tag.activationCodeEncrypted)
      const url = this.baseUrl.buildProfileUrl(tag.publicId.value)
      const qrPng = await this.qrGen.generatePng(url, { size: QR_PIXEL_SIZE })
      labels.push({ publicId: tag.publicId.value, url, code, qrPng })
    }

    const pdf = await this.sheet.generate(labels)

    await this.audit.log({
      action: 'batch_sheet_generate',
      entity: 'batch',
      entityId: batch.id,
      metadata: { count: labels.length, operatorId },
    })

    return {
      pdf,
      filename: `lote-${this.sanitizeFilename(batch.name)}.pdf`,
      count: labels.length,
    }
  }

  private sanitizeFilename(name: string): string {
    const safe = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase()
    return safe || 'lote'
  }
}
