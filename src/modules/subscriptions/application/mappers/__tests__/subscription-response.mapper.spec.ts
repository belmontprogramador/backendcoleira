import { SubscriptionResponseMapper } from '../subscription-response.mapper'
import { Subscription } from '../../../domain/entities/subscription.entity'

describe('SubscriptionResponseMapper', () => {
  it('mapeia assinatura para response camelCase', () => {
    const startedAt = new Date('2026-01-01T00:00:00.000Z')
    const periodStart = new Date('2026-01-01T00:00:00.000Z')
    const periodEnd = new Date('2026-02-01T00:00:00.000Z')

    const sub = Subscription.reconstitute({
      id: 'sub-1',
      userId: 'user-1',
      planId: 'plan-1',
      provider: 'MERCADO_PAGO',
      providerCustomerId: null,
      providerSubscriptionId: null,
      status: 'ACTIVE',
      startedAt,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      cancelledAt: null,
      createdAt: startedAt,
      updatedAt: startedAt,
    })

    const res = SubscriptionResponseMapper.toResponse(sub)

    expect(res).toEqual({
      id: 'sub-1',
      userId: 'user-1',
      planId: 'plan-1',
      provider: 'MERCADO_PAGO',
      status: 'ACTIVE',
      startedAt,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      cancelledAt: null,
    })
  })
})
