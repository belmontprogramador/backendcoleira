import { ListBatchesUseCase } from '../list-batches.use-case'
import type { BatchRepositoryPort } from '../../../domain/repositories/batch.repository.port'
import { Batch } from '../../../domain/entities/batch.entity'

describe('ListBatchesUseCase', () => {
  let batches: jest.Mocked<BatchRepositoryPort>

  beforeEach(() => {
    batches = {
      findById: jest.fn(),
      findByName: jest.fn(),
      list: jest.fn(),
      save: jest.fn(),
    }
  })

  function makeBatch(id: string): Batch {
    return Batch.create({
      id,
      name: `Lote ${id}`,
      quantity: 10,
      createdBy: 'operator-1',
    })
  }

  it('lista lotes com defaults de paginação', async () => {
    batches.list.mockResolvedValue([makeBatch('b1')])
    const useCase = new ListBatchesUseCase(batches)

    const result = await useCase.execute({})

    expect(batches.list).toHaveBeenCalledWith({
      status: undefined,
      page: 1,
      limit: 20,
    })
    expect(result).toHaveLength(1)
  })

  it('repassa status e paginação ao repositório', async () => {
    batches.list.mockResolvedValue([])
    const useCase = new ListBatchesUseCase(batches)

    await useCase.execute({ status: 'COMPLETED', page: 2, limit: 10 })

    expect(batches.list).toHaveBeenCalledWith({
      status: 'COMPLETED',
      page: 2,
      limit: 10,
    })
  })
})
