import { listOrdersSchema } from '../list-orders.schema'

describe('listOrdersSchema', () => {
  it('aplica defaults de page/limit', () => {
    const parsed = listOrdersSchema.safeParse({})
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.page).toBe(1)
      expect(parsed.data.limit).toBe(20)
    }
  })

  it('aceita status válido', () => {
    expect(listOrdersSchema.safeParse({ status: 'PAID' }).success).toBe(true)
  })

  it('rejeita status inválido', () => {
    expect(listOrdersSchema.safeParse({ status: 'UNKNOWN' }).success).toBe(false)
  })

  it('rejeita limit > 100', () => {
    expect(listOrdersSchema.safeParse({ limit: 101 }).success).toBe(false)
  })
})
