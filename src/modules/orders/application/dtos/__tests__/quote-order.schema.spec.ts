import { quoteOrderSchema } from '../quote-order.schema'

describe('quoteOrderSchema', () => {
  it('aceita CEP + quantidade default 1', () => {
    const result = quoteOrderSchema.safeParse({ postalCode: '01310-100' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.quantity).toBe(1)
    }
  })

  it('aceita quantidade explícita', () => {
    const result = quoteOrderSchema.safeParse({
      postalCode: '01310100',
      quantity: '3',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.quantity).toBe(3)
    }
  })

  it('rejeita CEP curto demais', () => {
    expect(quoteOrderSchema.safeParse({ postalCode: '123' }).success).toBe(false)
  })
})
