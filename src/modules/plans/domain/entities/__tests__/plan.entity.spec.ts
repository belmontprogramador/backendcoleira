import { Plan, InvalidPlanIntervalCountError } from '../plan.entity'
import { Price } from '../../../../../common/value-objects/price.vo'

describe('Plan (entidade)', () => {
  it('cria um plano com defaults (MONTHLY, intervalCount 1, não default)', () => {
    const plan = Plan.create({
      id: 'plan-1',
      code: 'PREMIUM',
      name: 'Premium',
      price: Price.create(1990),
    })

    expect(plan.id).toBe('plan-1')
    expect(plan.code).toBe('PREMIUM')
    expect(plan.name).toBe('Premium')
    expect(plan.price.amountInCents).toBe(1990)
    expect(plan.interval).toBe('MONTHLY')
    expect(plan.intervalCount).toBe(1)
    expect(plan.isDefault).toBe(false)
    expect(plan.description).toBeNull()
  })

  it('cria um plano default com intervalo YEARLY', () => {
    const plan = Plan.create({
      id: 'plan-2',
      code: 'PREMIUM',
      name: 'Premium Anual',
      price: Price.create(19900),
      interval: 'YEARLY',
      intervalCount: 1,
      isDefault: true,
    })

    expect(plan.interval).toBe('YEARLY')
    expect(plan.isDefault).toBe(true)
  })

  it('rejeita intervalCount < 1', () => {
    expect(() =>
      Plan.create({
        id: 'plan-3',
        code: 'PREMIUM',
        name: 'Premium',
        price: Price.create(1990),
        intervalCount: 0,
      }),
    ).toThrow(InvalidPlanIntervalCountError)
  })

  it('reconstitui um plano persistido', () => {
    const now = new Date()
    const plan = Plan.reconstitute({
      id: 'plan-1',
      code: 'BASIC',
      name: 'Basic',
      description: 'Gratuito',
      price: Price.create(0),
      interval: 'MONTHLY',
      intervalCount: 1,
      isDefault: true,
      createdAt: now,
      updatedAt: now,
    })

    expect(plan.code).toBe('BASIC')
    expect(plan.price.isZero()).toBe(true)
    expect(plan.isDefault).toBe(true)
    expect(plan.createdAt).toBe(now)
  })
})
