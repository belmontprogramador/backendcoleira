import { UpdatePlanUseCase } from '../update-plan.use-case'
import type { PlanRepositoryPort } from '../../../domain/repositories/plan.repository.port'
import type { FeatureRepositoryPort } from '../../../domain/repositories/feature.repository.port'
import { Plan } from '../../../domain/entities/plan.entity'
import { Feature } from '../../../domain/entities/feature.entity'
import { Price } from '../../../../../common/value-objects/price.vo'
import { PlanNotFoundError } from '../../errors'

describe('UpdatePlanUseCase', () => {
  let plans: jest.Mocked<PlanRepositoryPort>
  let features: jest.Mocked<FeatureRepositoryPort>
  let useCase: UpdatePlanUseCase

  beforeEach(() => {
    plans = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByIds: jest.fn(),
      findByCode: jest.fn(),
      findDefault: jest.fn(),
      update: jest.fn(),
    }
    features = {
      findByCode: jest.fn(),
      findByPlanId: jest.fn(),
    }
    useCase = new UpdatePlanUseCase(plans, features)
  })

  it('atualiza preço e nome do plano', async () => {
    const plan = Plan.create({
      id: 'plan-1',
      code: 'PREMIUM',
      name: 'Premium',
      price: Price.create(1990),
    })
    plans.findById.mockResolvedValue(plan)
    plans.update.mockResolvedValue(plan)
    features.findByPlanId.mockResolvedValue([])

    const result = await useCase.execute('plan-1', {
      priceCents: 2990,
      name: 'Premium Plus',
    })

    expect(plans.update).toHaveBeenCalledTimes(1)
    expect(result.plan.price.amountInCents).toBe(2990)
    expect(result.plan.name).toBe('Premium Plus')
    expect(result.features).toEqual([])
  })

  it('atualiza somente a descrição (limpando com null)', async () => {
    const plan = Plan.create({
      id: 'plan-1',
      code: 'PREMIUM',
      name: 'Premium',
      description: 'Antiga',
      price: Price.create(1990),
    })
    plans.findById.mockResolvedValue(plan)
    plans.update.mockResolvedValue(plan)
    features.findByPlanId.mockResolvedValue([])

    await useCase.execute('plan-1', { description: null })

    expect(plan.description).toBeNull()
    expect(plan.price.amountInCents).toBe(1990)
  })

  it('lança PlanNotFoundError quando o plano não existe', async () => {
    plans.findById.mockResolvedValue(null)

    await expect(
      useCase.execute('inexistente', { priceCents: 100 }),
    ).rejects.toThrow(PlanNotFoundError)
  })

  it('repassa as features do plano atualizado', async () => {
    const plan = Plan.create({
      id: 'plan-1',
      code: 'PREMIUM',
      name: 'Premium',
      price: Price.create(1990),
    })
    const feature = Feature.create({
      id: 'f-1',
      code: 'PET_MEDICAL',
      name: 'Ficha Médica',
    })
    plans.findById.mockResolvedValue(plan)
    plans.update.mockResolvedValue(plan)
    features.findByPlanId.mockResolvedValue([feature])

    const result = await useCase.execute('plan-1', { priceCents: 2500 })

    expect(features.findByPlanId).toHaveBeenCalledWith('plan-1')
    expect(result.features).toHaveLength(1)
  })
})
