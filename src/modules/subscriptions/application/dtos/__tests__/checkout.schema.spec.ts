import { checkoutSchema } from '../checkout.schema'

describe('checkoutSchema', () => {
  it('aceita PIX', () => {
    expect(
      checkoutSchema.parse({ planId: 'plan-1', paymentMethod: 'PIX' }),
    ).toEqual({ planId: 'plan-1', paymentMethod: 'PIX' })
  })

  it('aceita CARD com cardToken', () => {
    expect(
      checkoutSchema.parse({
        planId: 'plan-1',
        paymentMethod: 'CARD',
        cardToken: 'tok-123',
      }),
    ).toEqual({
      planId: 'plan-1',
      paymentMethod: 'CARD',
      cardToken: 'tok-123',
    })
  })

  it('rejeita paymentMethod inválido', () => {
    expect(() =>
      checkoutSchema.parse({ planId: 'plan-1', paymentMethod: 'CASH' }),
    ).toThrow()
  })

  it('rejeita planId vazio', () => {
    expect(() =>
      checkoutSchema.parse({ planId: '', paymentMethod: 'PIX' }),
    ).toThrow()
  })

  it('rejeita CARD sem cardToken', () => {
    expect(() =>
      checkoutSchema.parse({ planId: 'plan-1', paymentMethod: 'CARD' }),
    ).toThrow()
  })
})
