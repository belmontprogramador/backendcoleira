import { Inject, Injectable } from '@nestjs/common'
import { NFC_TAG_REPOSITORY_PORT } from '../../domain/repositories/nfc-tag.repository.port'
import type { NfcTagRepositoryPort } from '../../domain/repositories/nfc-tag.repository.port'
import { BATCH_REPOSITORY_PORT } from '../../domain/repositories/batch.repository.port'
import type { BatchRepositoryPort } from '../../domain/repositories/batch.repository.port'
import { AUDIT_LOGGER_PORT } from '../../../../common/ports/audit-logger.port'
import type { AuditLoggerPort } from '../../../../common/ports/audit-logger.port'
import type { NfcTag } from '../../domain/entities/nfc-tag.entity'
import { TagStatus } from '../../domain/entities/nfc-tag.entity'
import { TagNotFoundError } from '../errors'

/**
 * Caso de uso: reset "virgem total" de um pingente — volta a CREATED limpando
 * uid + owner + pet + ativação. Preserva publicId + código (identidade).
 *
 * Regra o card quantas vezes o operador quiser (D5). Idempotente: reset de uma
 * tag já CREATED é no-op. Decrementa o contador de gravados do lote (D6-A).
 * Permissão `tag:record` (OPERATOR) na rota.
 */
@Injectable()
export class ResetTagUseCase {
  constructor(
    @Inject(NFC_TAG_REPOSITORY_PORT)
    private readonly tags: NfcTagRepositoryPort,
    @Inject(BATCH_REPOSITORY_PORT)
    private readonly batches: BatchRepositoryPort,
    @Inject(AUDIT_LOGGER_PORT) private readonly audit: AuditLoggerPort,
  ) {}

  async execute(operatorId: string, publicId: string): Promise<NfcTag> {
    const tag = await this.tags.findByPublicId(publicId)
    if (!tag) {
      throw new TagNotFoundError(publicId)
    }

    const previousStatus = tag.status
    const wasWritten = previousStatus === TagStatus.READY

    tag.reset()
    await this.tags.save(tag)

    if (wasWritten && tag.batchId) {
      const batch = await this.batches.findById(tag.batchId)
      if (batch) {
        batch.decrementWritten()
        await this.batches.save(batch)
      }
    }

    await this.audit.log({
      action: 'tag_reset',
      entity: 'nfc_tag',
      entityId: tag.id,
      metadata: { publicId, operatorId, previousStatus },
    })

    return tag
  }
}
