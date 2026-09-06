import { Product } from '../product.entity'
import { Price } from '../../../../../common/value-objects/price.vo'

describe('Product (entidade)', () => {
  const price = Price.create(1990)
  const id = 'prod-1'

  it('cria produto com defaults (ativo, sem descrição, trim)', () => {
    const product = Product.create({
      id,
      sku: ' pingente ',
      name: ' Pingente Elopet ',
      price,
    })

    expect(product.id).toBe(id)
    expect(product.sku).toBe('pingente')
    expect(product.name).toBe('Pingente Elopet')
    expect(product.description).toBeNull()
    expect(product.price.amountInCents).toBe(1990)
    expect(product.active).toBe(true)
  })

  it('aceita descrição e active=false', () => {
    const product = Product.create({
      id,
      sku: 'pingente',
      name: 'Pingente',
      price,
      description: 'Colar NFC',
      active: false,
    })

    expect(product.description).toBe('Colar NFC')
    expect(product.active).toBe(false)
  })

  it('rejeita sku vazio', () => {
    expect(() =>
      Product.create({ id, sku: '   ', name: 'Pingente', price }),
    ).toThrow('SKU do produto é obrigatório')
  })

  it('rejeita nome vazio', () => {
    expect(() =>
      Product.create({ id, sku: 'pingente', name: '  ', price }),
    ).toThrow('Nome do produto é obrigatório')
  })

  it('reconstitui a partir do banco', () => {
    const createdAt = new Date('2026-09-01T00:00:00Z')
    const updatedAt = new Date('2026-09-02T00:00:00Z')
    const product = Product.reconstitute({
      id,
      sku: 'pingente',
      name: 'Pingente',
      description: null,
      price,
      active: true,
      createdAt,
      updatedAt,
    })

    expect(product.createdAt).toEqual(createdAt)
    expect(product.updatedAt).toEqual(updatedAt)
  })

  describe('updateDetails', () => {
    const make = () =>
      Product.reconstitute({
        id,
        sku: 'pingente',
        name: 'Pingente',
        description: 'X',
        price,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

    it('atualiza nome e preço', () => {
      const product = make()
      product.updateDetails({ name: ' Pingente Premium ', price: Price.create(2990) })

      expect(product.name).toBe('Pingente Premium')
      expect(product.price.amountInCents).toBe(2990)
    })

    it('atualiza descrição (inclusive nula) e active', () => {
      const product = make()
      product.updateDetails({ description: null, active: false })

      expect(product.description).toBeNull()
      expect(product.active).toBe(false)
    })

    it('rejeita nome vazio na atualização', () => {
      const product = make()
      expect(() => product.updateDetails({ name: '  ' })).toThrow(
        'Nome do produto é obrigatório',
      )
    })

    it('não altera campos não informados', () => {
      const product = make()
      product.updateDetails({ price: Price.create(1) })

      expect(product.name).toBe('Pingente')
      expect(product.description).toBe('X')
      expect(product.active).toBe(true)
    })
  })
})
