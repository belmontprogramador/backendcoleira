import { PlanMapper } from '../plan.mapper'
import { Plan } from '../../../domain/entities/plan.entity'
import { Price } from '../../../../../common/value-objects/price.vo'
import type { PlanModel } from '../../../../../generated/prisma/models/Plan'

describe('PlanMapper', () => {
  it('converte domínio → persistência (snake_case)', () => {
    const plan = Plan.create({
      id: 'plan-1',
      code: 'PREMIUM',
      name: 'Premium',
      price: Price.create(1990),
    })

    const data = PlanMapper.toPersistence(plan)

    expect(data.id).toBe('plan-1')
    expect(data.code).toBe('PREMIUM')
    expect(data.price_cents).toBe(1990)
    expect(data.currency).toBe('BRL')
    expect(data.interval).toBe('MONTHLY')
    expect(data.interval_count).toBe(1)
    expect(data.is_default).toBe(false)
  })

  it('converte persistência → domínio', () => {
    const model = {
      id: 'plan-1',
      code: 'BASIC',
      name: 'Basic',
      description: 'Gratuito',
      price_cents: 0,
      currency: 'BRL',
      interval: 'MONTHLY',
      interval_count: 1,
      is_default: true,
      created_at: new Date('2026-01-01T00:00:00.000Z'),
      updated_at: new Date('2026-01-01T00:00:00.000Z'),
    } as PlanModel

    const plan = PlanMapper.toDomain(model)

    expect(plan.id).toBe('plan-1')
    expect(plan.code).toBe('BASIC')
    expect(plan.price.amountInCents).toBe(0)
    expect(plan.price.isZero()).toBe(true)
    expect(plan.interval).toBe('MONTHLY')
    expect(plan.isDefault).toBe(true)
  })
})
