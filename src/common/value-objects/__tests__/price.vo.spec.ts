import { Price, InvalidPriceError } from '../price.vo'

describe('Price (value object)', () => {
  it('cria um preço em centavos com moeda BRL', () => {
    const price = Price.create(1990)

    expect(price.amountInCents).toBe(1990)
    expect(price.currency).toBe('BRL')
  })

  it('aceita zero (Basic gratuito)', () => {
    const price = Price.create(0)

    expect(price.amountInCents).toBe(0)
    expect(price.isZero()).toBe(true)
  })

  it('rejeita valor negativo', () => {
    expect(() => Price.create(-1)).toThrow(InvalidPriceError)
  })

  it('rejeita valor fracionário (centavos devem ser inteiros)', () => {
    expect(() => Price.create(19.9)).toThrow(InvalidPriceError)
  })

  it('expõe o helper zero()', () => {
    const price = Price.zero()

    expect(price.amountInCents).toBe(0)
    expect(price.currency).toBe('BRL')
    expect(price.isZero()).toBe(true)
  })
})
