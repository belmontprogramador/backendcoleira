import { Inject, Injectable } from '@nestjs/common'
import { BATCH_REPOSITORY_PORT } from '../../domain/repositories/batch.repository.port'
import type { BatchRepositoryPort } from '../../domain/repositories/batch.repository.port'
import { AUDIT_LOGGER_PORT } from '../../../../common/ports/audit-logger.port'
import type { AuditLoggerPort } from '../../../../common/ports/audit-logger.port'
import type { Batch } from '../../domain/entities/batch.entity'
import { BatchNotFoundError } from '../errors'

/**
 * Caso de uso: finalizar um lote (status COMPLETED).
 */
@Injectable()
export class CompleteBatchUseCase {
  constructor(
    @Inject(BATCH_REPOSITORY_PORT)
    private readonly batches: BatchRepositoryPort,
    @Inject(AUDIT_LOGGER_PORT) private readonly audit: AuditLoggerPort,
  ) {}

  async execute(batchId: string): Promise<Batch> {
    const batch = await this.batches.findById(batchId)
    if (!batch) {
      throw new BatchNotFoundError(batchId)
    }

    batch.complete()
    await this.batches.save(batch)

    await this.audit.log({
      action: 'batch_complete',
      entity: 'batch',
      entityId: batchId,
    })

    return batch
  }
}
