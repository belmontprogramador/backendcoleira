import { randomUUID } from 'node:crypto'
import { CreateBatchUseCase } from '../create-batch.use-case'
import { DuplicateBatchNameError } from '../../errors'
import type { BatchRepositoryPort } from '../../../domain/repositories/batch.repository.port'
import type { AuditLoggerPort } from '../../../../../common/ports/audit-logger.port'
import { Batch } from '../../../domain/entities/batch.entity'

jest.mock('node:crypto', () => ({ randomUUID: () => 'batch-uuid-1' }))

describe('CreateBatchUseCase', () => {
  let batches: jest.Mocked<BatchRepositoryPort>
  let audit: jest.Mocked<AuditLoggerPort>
  let useCase: CreateBatchUseCase

  beforeEach(() => {
    batches = {
      findById: jest.fn(),
      findByName: jest.fn(),
      list: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    }
    audit = { log: jest.fn() }
    useCase = new CreateBatchUseCase(batches, audit)
  })

  it('cria um lote em PENDING', async () => {
    batches.findByName.mockResolvedValue(null)

    const result = await useCase.execute('operator-1', {
      name: 'Lote 001',
      quantity: 1000,
    })

    expect(result.id).toBe('batch-uuid-1')
    expect(result.status).toBe('PENDING')
    expect(result.quantity).toBe(1000)
    expect(result.createdBy).toBe('operator-1')
    expect(batches.save).toHaveBeenCalled()
  })

  it('rejeita nome duplicado', async () => {
    batches.findByName.mockResolvedValue(
      Batch.create({
        id: 'x',
        name: 'Lote 001',
        quantity: 10,
        createdBy: 'operator-1',
      }),
    )

    await expect(
      useCase.execute('operator-1', { name: 'Lote 001', quantity: 10 }),
    ).rejects.toThrow(DuplicateBatchNameError)
    expect(batches.save).not.toHaveBeenCalled()
  })

  it('audita a criação', async () => {
    batches.findByName.mockResolvedValue(null)

    await useCase.execute('operator-1', { name: 'Lote 001', quantity: 1000 })

    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'batch_create',
        entity: 'batch',
        entityId: 'batch-uuid-1',
      }),
    )
  })
})
