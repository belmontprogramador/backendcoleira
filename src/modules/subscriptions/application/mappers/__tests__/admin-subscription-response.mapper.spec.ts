import { AdminSubscriptionResponseMapper } from '../admin-subscription-response.mapper'
import { Subscription } from '../../../domain/entities/subscription.entity'
import { Plan } from '../../../../plans/domain/entities/plan.entity'
import { Price } from '../../../../../common/value-objects/price.vo'

describe('AdminSubscriptionResponseMapper', () => {
  function makeSubscription() {
    return Subscription.reconstitute({
      id: 'sub-1',
      userId: 'user-1',
      planId: 'plan-1',
      provider: 'MERCADO_PAGO',
      providerCustomerId: 'cust-123',
      providerSubscriptionId: 'mp-sub-123',
      status: 'ACTIVE',
      startedAt: new Date('2026-01-01T00:00:00.000Z'),
      currentPeriodStart: new Date('2026-01-01T00:00:00.000Z'),
      currentPeriodEnd: new Date('2026-02-01T00:00:00.000Z'),
      cancelledAt: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    })
  }

  it('mapeia assinatura + dono + plano e não vaza ids internos', () => {
    const subscription = makeSubscription()
    const plan = Plan.create({
      id: 'plan-1',
      code: 'PREMIUM',
      name: 'Premium',
      price: Price.create(1990),
    })

    const result = AdminSubscriptionResponseMapper.toResponse(
      subscription,
      { id: 'user-1', name: 'Dono', email: 'dono@email.com' },
      plan,
    )

    expect(result).toEqual({
      id: 'sub-1',
      status: 'ACTIVE',
      startedAt: subscription.startedAt,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelledAt: null,
      owner: { id: 'user-1', name: 'Dono', email: 'dono@email.com' },
      plan: {
        id: 'plan-1',
        code: 'PREMIUM',
        name: 'Premium',
        isDefault: false,
      },
    })
    expect(result).not.toHaveProperty('provider_customer_id')
    expect(result).not.toHaveProperty('providerSubscriptionId')
  })

  it('retorna owner/plan nulos quando não resolvidos', () => {
    const result = AdminSubscriptionResponseMapper.toResponse(
      makeSubscription(),
      null,
      null,
    )

    expect(result.owner).toBeNull()
    expect(result.plan).toBeNull()
  })
})
