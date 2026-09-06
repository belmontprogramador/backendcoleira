import { updateProductSchema } from '../update-product.schema'

describe('updateProductSchema', () => {
  it('aceita campos parciais', () => {
    expect(updateProductSchema.parse({ name: 'Pingente' })).toEqual({
      name: 'Pingente',
    })
    expect(updateProductSchema.parse({ priceCents: 1990 })).toEqual({
      priceCents: 1990,
    })
    expect(updateProductSchema.parse({ active: false })).toEqual({
      active: false,
    })
    expect(updateProductSchema.parse({ description: null })).toEqual({
      description: null,
    })
  })

  it('rejeita corpo vazio', () => {
    expect(() => updateProductSchema.parse({})).toThrow()
  })

  it('rejeita priceCents negativo ou não-inteiro', () => {
    expect(() => updateProductSchema.parse({ priceCents: -1 })).toThrow()
    expect(() => updateProductSchema.parse({ priceCents: 1.5 })).toThrow()
  })

  it('rejeita nome vazio', () => {
    expect(() => updateProductSchema.parse({ name: '   ' })).toThrow()
  })
})
