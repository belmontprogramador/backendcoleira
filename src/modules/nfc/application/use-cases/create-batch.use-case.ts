import { Inject, Injectable } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { BATCH_REPOSITORY_PORT } from '../../domain/repositories/batch.repository.port'
import type { BatchRepositoryPort } from '../../domain/repositories/batch.repository.port'
import { AUDIT_LOGGER_PORT } from '../../../../common/ports/audit-logger.port'
import type { AuditLoggerPort } from '../../../../common/ports/audit-logger.port'
import { Batch } from '../../domain/entities/batch.entity'
import { DuplicateBatchNameError } from '../errors'

export interface CreateBatchInput {
  name: string
  quantity: number
  description?: string
  prefix?: string
  externalRef?: string
}

/**
 * Caso de uso: criar um lote de produção.
 */
@Injectable()
export class CreateBatchUseCase {
  constructor(
    @Inject(BATCH_REPOSITORY_PORT)
    private readonly batches: BatchRepositoryPort,
    @Inject(AUDIT_LOGGER_PORT) private readonly audit: AuditLoggerPort,
  ) {}

  async execute(operatorId: string, input: CreateBatchInput): Promise<Batch> {
    const existing = await this.batches.findByName(input.name)
    if (existing) {
      throw new DuplicateBatchNameError(input.name)
    }

    const batch = Batch.create({
      id: randomUUID(),
      name: input.name,
      quantity: input.quantity,
      createdBy: operatorId,
      description: input.description ?? null,
      prefix: input.prefix ?? null,
      externalRef: input.externalRef ?? null,
    })

    await this.batches.save(batch)
    await this.audit.log({
      action: 'batch_create',
      entity: 'batch',
      entityId: batch.id,
      metadata: { name: batch.name, quantity: batch.quantity },
    })

    return batch
  }
}
