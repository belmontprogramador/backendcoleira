import { Inject, Injectable } from '@nestjs/common'
import { BATCH_REPOSITORY_PORT } from '../../domain/repositories/batch.repository.port'
import type { BatchRepositoryPort } from '../../domain/repositories/batch.repository.port'
import { AUDIT_LOGGER_PORT } from '../../../../common/ports/audit-logger.port'
import type { AuditLoggerPort } from '../../../../common/ports/audit-logger.port'
import type { Batch } from '../../domain/entities/batch.entity'
import { BatchNotFoundError } from '../errors'

/**
 * Caso de uso: cancelar um lote (status CANCELLED).
 */
@Injectable()
export class CancelBatchUseCase {
  constructor(
    @Inject(BATCH_REPOSITORY_PORT)
    private readonly batches: BatchRepositoryPort,
    @Inject(AUDIT_LOGGER_PORT) private readonly audit: AuditLoggerPort,
  ) {}

  async execute(batchId: string, reason: string): Promise<Batch> {
    const batch = await this.batches.findById(batchId)
    if (!batch) {
      throw new BatchNotFoundError(batchId)
    }

    batch.cancel(reason)
    await this.batches.save(batch)

    await this.audit.log({
      action: 'batch_cancel',
      entity: 'batch',
      entityId: batchId,
      metadata: { reason },
    })

    return batch
  }
}
