import { Inject, Injectable } from '@nestjs/common'
import { BATCH_REPOSITORY_PORT } from '../../domain/repositories/batch.repository.port'
import type { BatchRepositoryPort } from '../../domain/repositories/batch.repository.port'
import type { Batch } from '../../domain/entities/batch.entity'

export interface ListBatchesFilter {
  status?: string
  page?: number
  limit?: number
}

/**
 * Caso de uso: listar lotes de produção (paginado, com filtro opcional de status).
 * Espelho de `ListTagsUseCase` — array puro, sem envelope.
 */
@Injectable()
export class ListBatchesUseCase {
  constructor(
    @Inject(BATCH_REPOSITORY_PORT)
    private readonly batches: BatchRepositoryPort,
  ) {}

  async execute(filter: ListBatchesFilter): Promise<Batch[]> {
    return this.batches.list({
      status: filter.status,
      page: filter.page ?? 1,
      limit: filter.limit ?? 20,
    })
  }
}
