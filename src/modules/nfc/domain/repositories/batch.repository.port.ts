import type { Batch } from '../entities/batch.entity'

/**
 * Porta do repositório de lotes de produção.
 */
export interface BatchRepositoryPort {
  findById(id: string): Promise<Batch | null>
  findByName(name: string): Promise<Batch | null>
  list(filter: {
    status?: string
    page: number
    limit: number
  }): Promise<Batch[]>
  save(batch: Batch): Promise<void>
  /** Exclui definitivamente o lote (hard delete). */
  delete(id: string): Promise<void>
}

export const BATCH_REPOSITORY_PORT = Symbol('BATCH_REPOSITORY_PORT')
