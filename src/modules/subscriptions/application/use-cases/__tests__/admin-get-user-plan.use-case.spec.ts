import { AdminGetUserPlanUseCase } from '../admin-get-user-plan.use-case'
import type { SubscriptionRepositoryPort } from '../../../domain/repositories/subscription.repository.port'
import type { PlanRepositoryPort } from '../../../../plans/domain/repositories/plan.repository.port'
import { Subscription } from '../../../domain/entities/subscription.entity'
import { Plan } from '../../../../plans/domain/entities/plan.entity'
import { Price } from '../../../../../common/value-objects/price.vo'

describe('AdminGetUserPlanUseCase', () => {
  let subscriptions: jest.Mocked<SubscriptionRepositoryPort>
  let plans: jest.Mocked<PlanRepositoryPort>

  beforeEach(() => {
    subscriptions = {
      save: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      findActiveByUserId: jest.fn(),
    }
    plans = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByCode: jest.fn(),
      findDefault: jest.fn(),
    }
  })

  it('retorna null/null quando o usuário não tem assinatura ativa (free)', async () => {
    subscriptions.findActiveByUserId.mockResolvedValue(null)

    const result = await new AdminGetUserPlanUseCase(
      subscriptions,
      plans,
    ).execute('user-1')

    expect(result).toEqual({ plan: null, subscription: null })
    expect(plans.findById).not.toHaveBeenCalled()
  })

  it('retorna plano + assinatura quando há assinatura ativa (Premium)', async () => {
    const startedAt = new Date('2026-01-01T00:00:00.000Z')
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
      currentPeriodEnd: new Date('2026-02-01T00:00:00.000Z'),
      cancelledAt: null,
      createdAt: startedAt,
      updatedAt: startedAt,
    })
    subscriptions.findActiveByUserId.mockResolvedValue(subscription)

    const plan = Plan.create({
      id: 'plan-1',
      code: 'PREMIUM',
      name: 'Premium',
      price: Price.create(1990),
    })
    plans.findById.mockResolvedValue(plan)

    const result = await new AdminGetUserPlanUseCase(
      subscriptions,
      plans,
    ).execute('user-1')

    expect(plans.findById).toHaveBeenCalledWith('plan-1')
    expect(result.plan?.code).toBe('PREMIUM')
    expect(result.subscription?.id).toBe('sub-1')
  })
})
