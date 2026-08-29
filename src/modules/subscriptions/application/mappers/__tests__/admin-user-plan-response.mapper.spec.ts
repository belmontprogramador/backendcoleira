import { AdminUserPlanResponseMapper } from '../admin-user-plan-response.mapper'
import { Subscription } from '../../../domain/entities/subscription.entity'
import { Plan } from '../../../../plans/domain/entities/plan.entity'
import { Price } from '../../../../../common/value-objects/price.vo'

describe('AdminUserPlanResponseMapper', () => {
  it('mapeia plano + assinatura ativa (Premium)', () => {
    const startedAt = new Date('2026-01-01T00:00:00.000Z')
    const periodEnd = new Date('2026-02-01T00:00:00.000Z')

    const plan = Plan.create({
      id: 'plan-1',
      code: 'PREMIUM',
      name: 'Premium',
      price: Price.create(1990),
      isDefault: false,
    })
    const subscription = Subscription.reconstitute({
      id: 'sub-1',
      userId: 'user-1',
      planId: 'plan-1',
      provider: 'MERCADO_PAGO',
      providerCustomerId: null,
      providerSubscriptionId: null,
      status: 'ACTIVE',
      startedAt,
      currentPeriodStart: startedAt,
      currentPeriodEnd: periodEnd,
      cancelledAt: null,
      createdAt: startedAt,
      updatedAt: startedAt,
    })

    const res = AdminUserPlanResponseMapper.toResponse({ plan, subscription })

    expect(res.plan).toEqual({
      id: 'plan-1',
      code: 'PREMIUM',
      name: 'Premium',
      isDefault: false,
    })
    expect(res.subscription).toEqual({
      id: 'sub-1',
      status: 'ACTIVE',
      currentPeriodEnd: periodEnd,
    })
  })

  it('mapeia usuário free (null/null)', () => {
    const res = AdminUserPlanResponseMapper.toResponse({
      plan: null,
      subscription: null,
    })

    expect(res).toEqual({ plan: null, subscription: null })
  })
})
