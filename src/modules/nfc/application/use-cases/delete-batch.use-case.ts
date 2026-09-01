import { Inject, Injectable } from '@nestjs/common'
import { BATCH_REPOSITORY_PORT } from '../../domain/repositories/batch.repository.port'
import type { BatchRepositoryPort } from '../../domain/repositories/batch.repository.port'
import { NFC_TAG_REPOSITORY_PORT } from '../../domain/repositories/nfc-tag.repository.port'
import type { NfcTagRepositoryPort } from '../../domain/repositories/nfc-tag.repository.port'
import { AUDIT_LOGGER_PORT } from '../../../../common/ports/audit-logger.port'
import type { AuditLoggerPort } from '../../../../common/ports/audit-logger.port'
import { BatchNotFoundError } from '../errors'

export interface DeleteBatchResult {
  batchId: string
  deletedTags: number
}

/**
 * Caso de uso: excluir definitivamente um lote (hard delete) e todas as suas
 * tags. A ordem importa: apaga as tags ANTES do lote — `nfc_tags.batch_id` tem
 * `onDelete: SetNull`, então apagar o lote primeiro deixaria as tags órfãs.
 */
@Injectable()
export class DeleteBatchUseCase {
  constructor(
    @Inject(BATCH_REPOSITORY_PORT)
    private readonly batches: BatchRepositoryPort,
    @Inject(NFC_TAG_REPOSITORY_PORT)
    private readonly tags: NfcTagRepositoryPort,
    @Inject(AUDIT_LOGGER_PORT) private readonly audit: AuditLoggerPort,
  ) {}

  async execute(
    operatorId: string,
    batchId: string,
  ): Promise<DeleteBatchResult> {
    const batch = await this.batches.findById(batchId)
    if (!batch) {
      throw new BatchNotFoundError(batchId)
    }

    const deletedTags = await this.tags.deleteByBatch(batchId)
    await this.batches.delete(batchId)

    await this.audit.log({
      action: 'batch_purge',
      entity: 'batch',
      entityId: batchId,
      metadata: { operatorId, deletedTags },
    })

    return { batchId, deletedTags }
  }
}
