import { ListPlansUseCase } from '../list-plans.use-case'
import type { PlanRepositoryPort } from '../../../domain/repositories/plan.repository.port'
import type { FeatureRepositoryPort } from '../../../domain/repositories/feature.repository.port'
import { Plan } from '../../../domain/entities/plan.entity'
import { Feature } from '../../../domain/entities/feature.entity'
import { Price } from '../../../../../common/value-objects/price.vo'

function makePlan(id: string, code: string, cents: number): Plan {
  return Plan.create({ id, code, name: code, price: Price.create(cents) })
}

function makeFeature(id: string, code: string): Feature {
  return Feature.create({ id, code, name: code })
}

describe('ListPlansUseCase', () => {
  let plans: jest.Mocked<PlanRepositoryPort>
  let features: jest.Mocked<FeatureRepositoryPort>

  beforeEach(() => {
    plans = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByCode: jest.fn(),
      findDefault: jest.fn(),
    }
    features = { findByCode: jest.fn(), findByPlanId: jest.fn() }
  })

  it('lista planos com suas features', async () => {
    plans.findAll.mockResolvedValue([
      makePlan('plan-1', 'BASIC', 0),
      makePlan('plan-2', 'PREMIUM', 1990),
    ])
    features.findByPlanId.mockImplementation((planId: string) =>
      Promise.resolve(
        planId === 'plan-1' ? [] : [makeFeature('feat-1', 'PET_MEDICAL')],
      ),
    )

    const useCase = new ListPlansUseCase(plans, features)
    const result = await useCase.execute()

    expect(result).toHaveLength(2)
    expect(result[0].plan.code).toBe('BASIC')
    expect(result[0].features).toHaveLength(0)
    expect(result[1].plan.code).toBe('PREMIUM')
    expect(result[1].features).toHaveLength(1)
    expect(result[1].features[0].code).toBe('PET_MEDICAL')
  })

  it('lista planos mesmo sem features', async () => {
    plans.findAll.mockResolvedValue([makePlan('plan-1', 'BASIC', 0)])
    features.findByPlanId.mockResolvedValue([])

    const useCase = new ListPlansUseCase(plans, features)
    const result = await useCase.execute()

    expect(result).toHaveLength(1)
    expect(result[0].features).toHaveLength(0)
  })
})
