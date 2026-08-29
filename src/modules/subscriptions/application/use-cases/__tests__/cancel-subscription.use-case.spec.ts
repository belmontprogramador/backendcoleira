import { CancelSubscriptionUseCase } from '../cancel-subscription.use-case'
import type { SubscriptionRepositoryPort } from '../../../domain/repositories/subscription.repository.port'
import type { AuditLoggerPort } from '../../../../../common/ports/audit-logger.port'
import { SubscriptionNotFoundError } from '../../errors'
import { Subscription } from '../../../domain/entities/subscription.entity'

describe('CancelSubscriptionUseCase', () => {
  let subscriptions: jest.Mocked<SubscriptionRepositoryPort>
  let audit: jest.Mocked<AuditLoggerPort>

  beforeEach(() => {
    subscriptions = {
      save: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      findActiveByUserId: jest.fn(),
    }
    audit = { log: jest.fn() }
  })

  function makeActiveSubscription() {
    return Subscription.reconstitute({
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
  }

  it('cancela assinatura ativa (CANCELLED + cancelled_at) e audita', async () => {
    const subscription = makeActiveSubscription()
    subscriptions.findByUserId.mockResolvedValue(subscription)

    const result = await new CancelSubscriptionUseCase(
      subscriptions,
      audit,
    ).execute('user-1')

    expect(result.status).toBe('CANCELLED')
    expect(result.cancelledAt).not.toBeNull()
    expect(subscriptions.save).toHaveBeenCalledWith(subscription)
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'subscription.cancelled' }),
    )
  })

  it('lança SubscriptionNotFoundError quando não há assinatura', async () => {
    subscriptions.findByUserId.mockResolvedValue(null)

    await expect(
      new CancelSubscriptionUseCase(subscriptions, audit).execute('user-1'),
    ).rejects.toThrow(SubscriptionNotFoundError)

    expect(subscriptions.save).not.toHaveBeenCalled()
  })
})
