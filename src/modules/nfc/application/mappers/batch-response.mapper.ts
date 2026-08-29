import type { Batch } from '../../domain/entities/batch.entity'

export interface BatchResponse {
  id: string
  name: string
  description: string | null
  prefix: string | null
  externalRef: string | null
  quantity: number
  status: string
  generatedCount: number
  writtenCount: number
  verifiedCount: number
  failedCount: number
  startedAt: Date | null
  completedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Converte o agregado `Batch` em DTO de resposta seguro.
 * NÃO expõe `createdBy` (dado administrativo interno).
 */
export class BatchResponseMapper {
  static toResponse(batch: Batch): BatchResponse {
    return {
      id: batch.id,
      name: batch.name,
      description: batch.description,
      prefix: batch.prefix,
      externalRef: batch.externalRef,
      quantity: batch.quantity,
      status: batch.status,
      generatedCount: batch.generatedCount,
      writtenCount: batch.writtenCount,
      verifiedCount: batch.verifiedCount,
      failedCount: batch.failedCount,
      startedAt: batch.startedAt,
      completedAt: batch.completedAt,
      createdAt: batch.createdAt,
      updatedAt: batch.updatedAt,
    }
  }
}
