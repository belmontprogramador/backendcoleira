import { GetUserPlanFeaturesUseCase } from '../get-user-plan-features.use-case'
import type { SubscriptionRepositoryPort } from '../../../domain/repositories/subscription.repository.port'
import type { PlanRepositoryPort } from '../../../../plans/domain/repositories/plan.repository.port'
import type { FeatureRepositoryPort } from '../../../../plans/domain/repositories/feature.repository.port'
import { Subscription } from '../../../domain/entities/subscription.entity'
import { SubscriptionPeriod } from '../../../domain/value-objects/subscription-period.vo'
import { Plan } from '../../../../plans/domain/entities/plan.entity'
import { Feature } from '../../../../plans/domain/entities/feature.entity'
import { Price } from '../../../../../common/value-objects/price.vo'

const start = new Date('2026-08-28T00:00:00.000Z')
const end = new Date('2026-09-28T00:00:00.000Z')

describe('GetUserPlanFeaturesUseCase', () => {
  let subscriptions: jest.Mocked<SubscriptionRepositoryPort>
  let plans: jest.Mocked<PlanRepositoryPort>
  let features: jest.Mocked<FeatureRepositoryPort>

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
    features = { findByCode: jest.fn(), findByPlanId: jest.fn() }
  })

  it('retorna plano e features da assinatura ativa', async () => {
    const sub = Subscription.create({
      id: 'sub-1',
      userId: 'user-1',
      planId: 'plan-2',
      period: SubscriptionPeriod.create(start, end),
    })
    const plan = Plan.create({
      id: 'plan-2',
      code: 'PREMIUM',
      name: 'Premium',
      price: Price.create(1990),
    })
    const feat = Feature.create({
      id: 'feat-1',
      code: 'PET_MEDICAL',
      name: 'Dados médicos',
    })

    subscriptions.findActiveByUserId.mockResolvedValue(sub)
    plans.findById.mockResolvedValue(plan)
    features.findByPlanId.mockResolvedValue([feat])

    const useCase = new GetUserPlanFeaturesUseCase(
      subscriptions,
      plans,
      features,
    )
    const result = await useCase.execute('user-1')

    expect(result.plan?.code).toBe('PREMIUM')
    expect(result.features).toHaveLength(1)
    expect(result.features[0].code).toBe('PET_MEDICAL')
    expect(subscriptions.findActiveByUserId).toHaveBeenCalledWith('user-1')
  })

  it('retorna plano nulo e features vazias sem assinatura ativa', async () => {
    subscriptions.findActiveByUserId.mockResolvedValue(null)

    const useCase = new GetUserPlanFeaturesUseCase(
      subscriptions,
      plans,
      features,
    )
    const result = await useCase.execute('user-1')

    expect(result.plan).toBeNull()
    expect(result.features).toHaveLength(0)
    expect(plans.findById).not.toHaveBeenCalled()
  })
})
