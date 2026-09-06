import { shipOrderSchema } from '../ship-order.schema'

describe('shipOrderSchema', () => {
  it('aceita despacho sem dados de etiqueta (só marca SHIPPED)', () => {
    expect(shipOrderSchema.safeParse({}).success).toBe(true)
  })

  it('aceita os 3 campos da etiqueta juntos', () => {
    const result = shipOrderSchema.safeParse({
      meOrderId: 'me-1',
      protocol: 'P1',
      serviceId: '1',
      tracking: 'BR123',
    })
    expect(result.success).toBe(true)
  })

  it('rejeita meOrderId sem protocol/serviceId', () => {
    expect(
      shipOrderSchema.safeParse({ meOrderId: 'me-1' }).success,
    ).toBe(false)
  })
})
