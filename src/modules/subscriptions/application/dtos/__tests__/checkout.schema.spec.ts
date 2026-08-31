import { checkoutSchema } from '../checkout.schema'

describe('checkoutSchema', () => {
  it('aceita PIX', () => {
    expect(
      checkoutSchema.parse({ planId: 'plan-1', paymentMethod: 'PIX' }),
    ).toEqual({ planId: 'plan-1', paymentMethod: 'PIX' })
  })

  it('aceita CARD com cardToken + bandeira + issuer + CPF', () => {
    expect(
      checkoutSchema.parse({
        planId: 'plan-1',
        paymentMethod: 'CARD',
        cardToken: 'tok-123',
        cardPaymentMethodId: 'visa',
        cardIssuerId: '25',
        payerIdentificationType: 'CPF',
        payerIdentificationNumber: '12345678909',
      }),
    ).toEqual({
      planId: 'plan-1',
      paymentMethod: 'CARD',
      cardToken: 'tok-123',
      cardPaymentMethodId: 'visa',
      cardIssuerId: '25',
      payerIdentificationType: 'CPF',
      payerIdentificationNumber: '12345678909',
    })
  })

  it('aceita BOLETO com CPF', () => {
    expect(
      checkoutSchema.parse({
        planId: 'plan-1',
        paymentMethod: 'BOLETO',
        payerIdentificationType: 'CPF',
        payerIdentificationNumber: '12345678909',
      }),
    ).toEqual({
      planId: 'plan-1',
      paymentMethod: 'BOLETO',
      payerIdentificationType: 'CPF',
      payerIdentificationNumber: '12345678909',
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
      checkoutSchema.parse({
        planId: 'plan-1',
        paymentMethod: 'CARD',
        cardPaymentMethodId: 'visa',
        cardIssuerId: '25',
        payerIdentificationNumber: '12345678909',
      }),
    ).toThrow()
  })

  it('rejeita CARD sem bandeira/issuer', () => {
    expect(() =>
      checkoutSchema.parse({
        planId: 'plan-1',
        paymentMethod: 'CARD',
        cardToken: 'tok-123',
        payerIdentificationNumber: '12345678909',
      }),
    ).toThrow()
  })

  it('rejeita BOLETO sem CPF', () => {
    expect(() =>
      checkoutSchema.parse({ planId: 'plan-1', paymentMethod: 'BOLETO' }),
    ).toThrow()
  })
})
