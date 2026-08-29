import { PlanResponseMapper } from '../plan-response.mapper'
import { Plan } from '../../../domain/entities/plan.entity'
import { Feature } from '../../../domain/entities/feature.entity'
import { Price } from '../../../../../common/value-objects/price.vo'

describe('PlanResponseMapper', () => {
  it('mapeia plano + features para response camelCase', () => {
    const plan = Plan.create({
      id: 'plan-1',
      code: 'PREMIUM',
      name: 'Premium',
      description: 'Plano completo',
      price: Price.create(1990),
    })
    const features = [
      Feature.create({ id: 'f-1', code: 'PET_MEDICAL', name: 'Ficha Médica' }),
      Feature.create({ id: 'f-2', code: 'ACCESS_HISTORY', name: 'Histórico' }),
    ]

    const res = PlanResponseMapper.toResponse(plan, features)

    expect(res.id).toBe('plan-1')
    expect(res.code).toBe('PREMIUM')
    expect(res.name).toBe('Premium')
    expect(res.priceCents).toBe(1990)
    expect(res.currency).toBe('BRL')
    expect(res.interval).toBe('MONTHLY')
    expect(res.intervalCount).toBe(1)
    expect(res.isDefault).toBe(false)
    expect(res.features).toEqual([
      { code: 'PET_MEDICAL', name: 'Ficha Médica' },
      { code: 'ACCESS_HISTORY', name: 'Histórico' },
    ])
  })
})
