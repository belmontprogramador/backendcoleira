import { Inject, Injectable } from '@nestjs/common'
import { BATCH_REPOSITORY_PORT } from '../../domain/repositories/batch.repository.port'
import type { BatchRepositoryPort } from '../../domain/repositories/batch.repository.port'
import type { Batch } from '../../domain/entities/batch.entity'
import { BatchNotFoundError } from '../errors'

/**
 * Caso de uso: detalhar um lote de produção.
 */
@Injectable()
export class GetBatchUseCase {
  constructor(
    @Inject(BATCH_REPOSITORY_PORT)
    private readonly batches: BatchRepositoryPort,
  ) {}

  async execute(batchId: string): Promise<Batch> {
    const batch = await this.batches.findById(batchId)
    if (!batch) {
      throw new BatchNotFoundError(batchId)
    }
    return batch
  }
}
