import { MockShippingGateway } from '../mock-shipping.gateway'

describe('MockShippingGateway', () => {
  const gateway = new MockShippingGateway()

  it('retorna cotação mock', async () => {
    const quotes = await gateway.calculateQuote({
      fromPostalCode: 'x',
      toPostalCode: 'y',
    })
    expect(quotes).toHaveLength(1)
    expect(quotes[0].name).toContain('mock')
    expect(quotes[0].customPriceCents).toBe(0)
  })

  it('cria etiqueta mock', async () => {
    const result = await gateway.createShipment({
      service: 1,
      from: {
        name: 'A',
        phone: '1',
        email: 'a@b.c',
        postalCode: 'x',
        address: 'r',
        city: 'c',
        stateAbbr: 'SP',
      },
      to: {
        name: 'B',
        phone: '2',
        email: 'b@c.d',
        postalCode: 'y',
        address: 'r2',
        city: 'c2',
        stateAbbr: 'RJ',
      },
    })
    expect(result.orderId).toBe('mock-order-id')
    expect(result.protocol).toBe('mock-protocol')
  })

  it('printLabel devolve url mock', async () => {
    expect(await gateway.printLabel('private', ['1'])).toContain('etiqueta-mock')
  })

  it('payShipment/generateLabel não lançam', async () => {
    await expect(gateway.payShipment(['1'])).resolves.toBeUndefined()
    await expect(gateway.generateLabel(['1'])).resolves.toBeUndefined()
  })

  it('track retorna vazio', async () => {
    await expect(gateway.track(['1'])).resolves.toEqual({})
  })
})
