import { createOrderSchema } from '../create-order.schema'

const shipTo = {
  postalCode: '01310-100',
  street: 'Av. Paulista',
  number: '1000',
  city: 'São Paulo',
  state: 'SP',
  name: 'Fulano',
  phone: '11999999999',
}

describe('createOrderSchema', () => {
  it('aceita pedido PIX', () => {
    const parsed = createOrderSchema.safeParse({
      productId: 'p1',
      shipTo,
      freightServiceId: 1,
      paymentMethod: 'PIX',
    })
    expect(parsed.success).toBe(true)
    if (parsed.success) expect(parsed.data.quantity).toBe(1)
  })

  it('aceita pedido CARTÃO completo', () => {
    const parsed = createOrderSchema.safeParse({
      productId: 'p1',
      shipTo,
      freightServiceId: 1,
      paymentMethod: 'CARD',
      cardToken: 'tok',
      cardPaymentMethodId: 'visa',
      cardIssuerId: '25',
      payerIdentificationType: 'CPF',
      payerIdentificationNumber: '11144477735',
    })
    expect(parsed.success).toBe(true)
  })

  it('rejeita CARTÃO sem cardToken', () => {
    const parsed = createOrderSchema.safeParse({
      productId: 'p1',
      shipTo,
      freightServiceId: 1,
      paymentMethod: 'CARD',
      cardPaymentMethodId: 'visa',
      cardIssuerId: '25',
      payerIdentificationNumber: '11144477735',
    })
    expect(parsed.success).toBe(false)
  })

  it('rejeita CARTÃO sem cardPaymentMethodId/cardIssuerId', () => {
    const parsed = createOrderSchema.safeParse({
      productId: 'p1',
      shipTo,
      freightServiceId: 1,
      paymentMethod: 'CARD',
      cardToken: 'tok',
      payerIdentificationNumber: '11144477735',
    })
    expect(parsed.success).toBe(false)
  })

  it('rejeita BOLETO sem CPF/CNPJ', () => {
    const parsed = createOrderSchema.safeParse({
      productId: 'p1',
      shipTo,
      freightServiceId: 1,
      paymentMethod: 'BOLETO',
    })
    expect(parsed.success).toBe(false)
  })

  it('rejeita UF com tamanho diferente de 2', () => {
    const parsed = createOrderSchema.safeParse({
      productId: 'p1',
      shipTo: { ...shipTo, state: 'SPA' },
      freightServiceId: 1,
      paymentMethod: 'PIX',
    })
    expect(parsed.success).toBe(false)
  })

  it('rejeita CEP curto', () => {
    const parsed = createOrderSchema.safeParse({
      productId: 'p1',
      shipTo: { ...shipTo, postalCode: '123' },
      freightServiceId: 1,
      paymentMethod: 'PIX',
    })
    expect(parsed.success).toBe(false)
  })

  it('rejeita freightServiceId inválido', () => {
    const parsed = createOrderSchema.safeParse({
      productId: 'p1',
      shipTo,
      freightServiceId: 0,
      paymentMethod: 'PIX',
    })
    expect(parsed.success).toBe(false)
  })
})
