import { dashboardQuerySchema } from '../dashboard-query.schema'

describe('dashboardQuerySchema', () => {
  it('aplica defaults (granularity day, sem from/to)', () => {
    const parsed = dashboardQuerySchema.parse({})
    expect(parsed.granularity).toBe('day')
    expect(parsed.from).toBeUndefined()
    expect(parsed.to).toBeUndefined()
  })

  it('converte from/to para Date', () => {
    const parsed = dashboardQuerySchema.parse({
      from: '2026-08-01T00:00:00.000Z',
      to: '2026-08-31T00:00:00.000Z',
      granularity: 'month',
    })
    expect(parsed.from).toBeInstanceOf(Date)
    expect(parsed.to).toBeInstanceOf(Date)
    expect(parsed.granularity).toBe('month')
  })

  it('rejeita from inválida', () => {
    const result = dashboardQuerySchema.safeParse({ from: 'abc' })
    expect(result.success).toBe(false)
  })

  it('rejeita granularity inválida', () => {
    const result = dashboardQuerySchema.safeParse({ granularity: 'hour' })
    expect(result.success).toBe(false)
  })
})
