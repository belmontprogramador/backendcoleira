import {
  SubscriptionPeriod,
  InvalidSubscriptionPeriodError,
} from '../subscription-period.vo'

describe('SubscriptionPeriod (value object)', () => {
  it('cria um período com início antes do fim', () => {
    const start = new Date('2026-08-28T00:00:00Z')
    const end = new Date('2026-09-28T00:00:00Z')
    const period = SubscriptionPeriod.create(start, end)

    expect(period.start).toBe(start)
    expect(period.end).toBe(end)
  })

  it('rejeita início depois do fim', () => {
    const start = new Date('2026-09-28T00:00:00Z')
    const end = new Date('2026-08-28T00:00:00Z')
    expect(() => SubscriptionPeriod.create(start, end)).toThrow(
      InvalidSubscriptionPeriodError,
    )
  })

  it('rejeita início igual ao fim', () => {
    const t = new Date('2026-08-28T00:00:00Z')
    expect(() => SubscriptionPeriod.create(t, t)).toThrow(
      InvalidSubscriptionPeriodError,
    )
  })

  it('contém uma data dentro do período (inclusive início, exclusive fim)', () => {
    const start = new Date('2026-08-28T00:00:00Z')
    const end = new Date('2026-09-28T00:00:00Z')
    const period = SubscriptionPeriod.create(start, end)

    expect(period.contains(new Date('2026-08-28T00:00:00Z'))).toBe(true)
    expect(period.contains(new Date('2026-09-27T23:59:59Z'))).toBe(true)
    expect(period.contains(new Date('2026-09-28T00:00:00Z'))).toBe(false)
  })
})
