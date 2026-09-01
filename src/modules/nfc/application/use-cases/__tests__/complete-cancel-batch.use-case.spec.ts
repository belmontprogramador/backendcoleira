import { CompleteBatchUseCase } from '../complete-batch.use-case'
import { CancelBatchUseCase } from '../cancel-batch.use-case'
import { BatchNotFoundError } from '../../errors'
import type { BatchRepositoryPort } from '../../../domain/repositories/batch.repository.port'
import type { AuditLoggerPort } from '../../../../../common/ports/audit-logger.port'
import { Batch } from '../../../domain/entities/batch.entity'

describe('NFC — complete/cancel batch', () => {
  let batches: jest.Mocked<BatchRepositoryPort>
  let audit: jest.Mocked<AuditLoggerPort>

  beforeEach(() => {
    batches = {
      findById: jest.fn(),
      findByName: jest.fn(),
      list: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    }
    audit = { log: jest.fn() }
  })

  function generatedBatch(): Batch {
    const b = Batch.create({
      id: 'batch-1',
      name: 'Lote 001',
      quantity: 10,
      createdBy: 'operator-1',
    })
    b.startGenerating()
    b.finishGeneration(10)
    b.startWriting()
    return b
  }

  function batchToCancel(): Batch {
    const b = Batch.create({
      id: 'batch-1',
      name: 'Lote 001',
      quantity: 10,
      createdBy: 'operator-1',
    })
    b.startGenerating()
    b.finishGeneration(10)
    return b // GENERATED — cancelamento permitido (não está em WRITING)
  }

  describe('CompleteBatchUseCase', () => {
    it('finaliza um lote GENERATED', async () => {
      const batch = generatedBatch()
      batches.findById.mockResolvedValue(batch)
      const useCase = new CompleteBatchUseCase(batches, audit)

      const result = await useCase.execute('batch-1')

      expect(result.status).toBe('COMPLETED')
      expect(result.completedAt).not.toBeNull()
    })

    it('lança BatchNotFoundError se não existe', async () => {
      batches.findById.mockResolvedValue(null)
      const useCase = new CompleteBatchUseCase(batches, audit)

      await expect(useCase.execute('x')).rejects.toThrow(BatchNotFoundError)
    })
  })

  describe('CancelBatchUseCase', () => {
    it('cancela um lote com motivo', async () => {
      const batch = batchToCancel()
      batches.findById.mockResolvedValue(batch)
      const useCase = new CancelBatchUseCase(batches, audit)

      const result = await useCase.execute('batch-1', 'Erro de fabricação')

      expect(result.status).toBe('CANCELLED')
      expect(result.cancelReason).toBe('Erro de fabricação')
    })

    it('lança BatchNotFoundError se não existe', async () => {
      batches.findById.mockResolvedValue(null)
      const useCase = new CancelBatchUseCase(batches, audit)

      await expect(useCase.execute('x', 'r')).rejects.toThrow(
        BatchNotFoundError,
      )
    })
  })
})
