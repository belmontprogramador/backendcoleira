import { DeleteBatchUseCase } from '../delete-batch.use-case'
import { BatchNotFoundError } from '../../errors'
import { Batch } from '../../../domain/entities/batch.entity'
import type { BatchRepositoryPort } from '../../../domain/repositories/batch.repository.port'
import type { NfcTagRepositoryPort } from '../../../domain/repositories/nfc-tag.repository.port'
import type { AuditLoggerPort } from '../../../../../common/ports/audit-logger.port'

describe('DeleteBatchUseCase', () => {
  let batches: jest.Mocked<BatchRepositoryPort>
  let tags: jest.Mocked<NfcTagRepositoryPort>
  let audit: jest.Mocked<AuditLoggerPort>
  let useCase: DeleteBatchUseCase

  beforeEach(() => {
    batches = {
      findById: jest.fn(),
      findByName: jest.fn(),
      list: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    }
    tags = {
      findById: jest.fn(),
      findByPublicId: jest.fn(),
      findByUid: jest.fn(),
      findNextToWrite: jest.fn(),
      listByBatch: jest.fn(),
      listByPet: jest.fn(),
      listUnactivated: jest.fn(),
      list: jest.fn(),
      count: jest.fn(),
      save: jest.fn(),
      saveMany: jest.fn(),
      deleteByBatch: jest.fn(),
    }
    audit = { log: jest.fn() }
    useCase = new DeleteBatchUseCase(batches, tags, audit)
  })

  function existingBatch(): Batch {
    return Batch.create({
      id: 'batch-1',
      name: 'Lote 001',
      quantity: 10,
      createdBy: 'operator-1',
    })
  }

  it('apaga as tags do lote antes do lote e retorna os totais', async () => {
    batches.findById.mockResolvedValue(existingBatch())
    tags.deleteByBatch.mockResolvedValue(3)

    const result = await useCase.execute('operator-1', 'batch-1')

    expect(tags.deleteByBatch).toHaveBeenCalledWith('batch-1')
    expect(batches.delete).toHaveBeenCalledWith('batch-1')
    expect(result).toEqual({ batchId: 'batch-1', deletedTags: 3 })
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'batch_purge' }),
    )
  })

  it('lança BatchNotFoundError se o lote não existe', async () => {
    batches.findById.mockResolvedValue(null)

    await expect(useCase.execute('operator-1', 'NAOEXISTE')).rejects.toThrow(
      BatchNotFoundError,
    )
    expect(tags.deleteByBatch).not.toHaveBeenCalled()
    expect(batches.delete).not.toHaveBeenCalled()
  })
})
