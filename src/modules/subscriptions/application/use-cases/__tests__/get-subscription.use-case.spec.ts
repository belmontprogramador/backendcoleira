import { GetSubscriptionUseCase } from '../get-subscription.use-case'
import type { SubscriptionRepositoryPort } from '../../../domain/repositories/subscription.repository.port'
import { Subscription } from '../../../domain/entities/subscription.entity'

describe('GetSubscriptionUseCase', () => {
  let subscriptions: jest.Mocked<SubscriptionRepositoryPort>

  beforeEach(() => {
    subscriptions = {
      save: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      findActiveByUserId: jest.fn(),
    }
  })

  it('retorna null quando não há assinatura', async () => {
    subscriptions.findByUserId.mockResolvedValue(null)

    const result = await new GetSubscriptionUseCase(subscriptions).execute(
      'user-1',
    )

    expect(result).toBeNull()
    expect(subscriptions.save).not.toHaveBeenCalled()
  })

  it('aplica expireIfDue (D8) e persiste a expiração lazy', async () => {
    const expired = Subscription.reconstitute({
      id: 'sub-1',
      userId: 'user-1',
      planId: 'plan-1',
      provider: 'MERCADO_PAGO',
      providerCustomerId: null,
      providerSubscriptionId: null,
      status: 'ACTIVE',
      startedAt: new Date('2025-11-01T00:00:00.000Z'),
      currentPeriodStart: new Date('2025-12-01T00:00:00.000Z'),
      currentPeriodEnd: new Date('2026-01-01T00:00:00.000Z'),
      cancelledAt: null,
      createdAt: new Date('2025-11-01T00:00:00.000Z'),
      updatedAt: new Date('2025-11-01T00:00:00.000Z'),
    })
    subscriptions.findByUserId.mockResolvedValue(expired)

    const result = await new GetSubscriptionUseCase(subscriptions).execute(
      'user-1',
      new Date('2026-01-20T00:00:00.000Z'),
    )

    expect(result?.status).toBe('EXPIRED')
    expect(subscriptions.save).toHaveBeenCalledWith(expired)
  })

  it('não altera assinatura ainda dentro do período', async () => {
    const active = Subscription.reconstitute({
      id: 'sub-1',
      userId: 'user-1',
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
    subscriptions.findByUserId.mockResolvedValue(active)

    const result = await new GetSubscriptionUseCase(subscriptions).execute(
      'user-1',
      new Date('2026-01-20T00:00:00.000Z'),
    )

    expect(result?.status).toBe('ACTIVE')
    expect(subscriptions.save).not.toHaveBeenCalled()
  })
})
