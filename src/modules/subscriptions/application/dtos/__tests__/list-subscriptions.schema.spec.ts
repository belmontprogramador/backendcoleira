import { listSubscriptionsSchema } from '../list-subscriptions.schema'

describe('listSubscriptionsSchema', () => {
  it('aplica defaults de página e limite', () => {
    const result = listSubscriptionsSchema.parse({})
    expect(result).toEqual({ page: 1, limit: 20 })
  })

  it('aceita status válido do enum SubscriptionStatus', () => {
    const result = listSubscriptionsSchema.parse({ status: 'ACTIVE' })
    expect(result.status).toBe('ACTIVE')
  })

  it('rejeita status inválido', () => {
    expect(() => listSubscriptionsSchema.parse({ status: 'INVALID' })).toThrow()
  })

  it('aceita planCode e userId como filtros opcionais', () => {
    const result = listSubscriptionsSchema.parse({
      planCode: 'PREMIUM',
      userId: 'user-1',
    })
    expect(result.planCode).toBe('PREMIUM')
    expect(result.userId).toBe('user-1')
  })

  it('rejeita planCode em branco', () => {
    expect(() => listSubscriptionsSchema.parse({ planCode: '   ' })).toThrow()
  })
})
