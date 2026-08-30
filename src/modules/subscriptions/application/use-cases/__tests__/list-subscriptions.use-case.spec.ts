import { ListSubscriptionsUseCase } from '../list-subscriptions.use-case'
import type { SubscriptionRepositoryPort } from '../../../domain/repositories/subscription.repository.port'
import { Subscription } from '../../../domain/entities/subscription.entity'

describe('ListSubscriptionsUseCase', () => {
  let subscriptions: jest.Mocked<SubscriptionRepositoryPort>
  let useCase: ListSubscriptionsUseCase

  beforeEach(() => {
    subscriptions = {
      save: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      findActiveByUserId: jest.fn(),
      list: jest.fn(),
      count: jest.fn(),
    }
    useCase = new ListSubscriptionsUseCase(subscriptions)
  })

  function makeSubscription(id: string, userId: string) {
    return Subscription.reconstitute({
      id,
      userId,
      planId: 'plan-1',
      provider: 'MERCADO_PAGO',
      providerCustomerId: null,
      providerSubscriptionId: null,
      status: 'ACTIVE',
      startedAt: new Date('2026-01-01T00:00:00.000Z'),
      currentPeriodStart: new Date('2026-01-01T00:00:00.000Z'),
      currentPeriodEnd: new Date('2026-02-01T00:00:00.000Z'),
      cancelledAt: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    })
  }

  it('lista assinaturas paginadas com total (list + count em paralelo)', async () => {
    const s1 = makeSubscription('sub-1', 'user-1')
    const s2 = makeSubscription('sub-2', 'user-2')
    subscriptions.list.mockResolvedValue([s1, s2])
    subscriptions.count.mockResolvedValue(42)

    const result = await useCase.execute({ page: 2, limit: 10 })

    expect(result).toEqual({ data: [s1, s2], total: 42, page: 2, limit: 10 })
    expect(subscriptions.list).toHaveBeenCalledWith({ page: 2, limit: 10 })
    expect(subscriptions.count).toHaveBeenCalledWith({ page: 2, limit: 10 })
  })

  it('repassa os filtros de status/planCode/userId para list e count', async () => {
    subscriptions.list.mockResolvedValue([])
    subscriptions.count.mockResolvedValue(0)

    const filter = {
      page: 1,
      limit: 20,
      status: 'ACTIVE',
      planCode: 'PREMIUM',
      userId: 'user-1',
    }
    await useCase.execute(filter)

    expect(subscriptions.list).toHaveBeenCalledWith(filter)
    expect(subscriptions.count).toHaveBeenCalledWith(filter)
  })
})
