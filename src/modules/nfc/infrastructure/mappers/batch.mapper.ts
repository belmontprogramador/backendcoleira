import { Batch, BatchStatus } from '../../domain/entities/batch.entity'
import type { BatchModel } from '../../../../generated/prisma/models/Batch'
import type { BatchStatus as PrismaBatchStatus } from '../../../../generated/prisma/enums'

/**
 * Converte o agregado `Batch` (domínio) para o formato de persistência Prisma
 * e vice-versa.
 */
export class BatchMapper {
  static toPersistence(batch: Batch): {
    id: string
    name: string
    description: string | null
    prefix: string | null
    external_ref: string | null
    quantity: number
    status: PrismaBatchStatus
    generated_count: number
    written_count: number
    verified_count: number
    failed_count: number
    created_by: string
    started_at: Date | null
    completed_at: Date | null
    cancelled_at: Date | null
    cancel_reason: string | null
    created_at: Date
    updated_at: Date
  } {
    return {
      id: batch.id,
      name: batch.name,
      description: batch.description,
      prefix: batch.prefix,
      external_ref: batch.externalRef,
      quantity: batch.quantity,
      status: batch.status,
      generated_count: batch.generatedCount,
      written_count: batch.writtenCount,
      verified_count: batch.verifiedCount,
      failed_count: batch.failedCount,
      created_by: batch.createdBy,
      started_at: batch.startedAt,
      completed_at: batch.completedAt,
      cancelled_at: batch.cancelledAt,
      cancel_reason: batch.cancelReason,
      created_at: batch.createdAt,
      updated_at: batch.updatedAt,
    }
  }

  static toDomain(model: BatchModel): Batch {
    return Batch.reconstitute({
      id: model.id,
      name: model.name,
      description: model.description,
      prefix: model.prefix,
      externalRef: model.external_ref,
      quantity: model.quantity,
      status: model.status as BatchStatus,
      generatedCount: model.generated_count,
      writtenCount: model.written_count,
      verifiedCount: model.verified_count,
      failedCount: model.failed_count,
      createdBy: model.created_by,
      startedAt: model.started_at,
      completedAt: model.completed_at,
      cancelledAt: model.cancelled_at,
      cancelReason: model.cancel_reason,
      createdAt: model.created_at,
      updatedAt: model.updated_at,
    })
  }
}
