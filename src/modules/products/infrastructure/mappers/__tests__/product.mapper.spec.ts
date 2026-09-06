import { ProductMapper } from '../product.mapper'
import { Product } from '../../../domain/entities/product.entity'
import { Price } from '../../../../../common/value-objects/price.vo'
import type { ProductModel } from '../../../../../generated/prisma/models/Product'

describe('ProductMapper', () => {
  it('converte domínio → persistência (snake_case)', () => {
    const product = Product.create({
      id: 'prod-1',
      sku: 'pingente',
      name: 'Pingente Elopet',
      description: 'Colar NFC',
      price: Price.create(1990),
    })

    const persistence = ProductMapper.toPersistence(product)

    expect(persistence).toMatchObject({
      id: 'prod-1',
      sku: 'pingente',
      name: 'Pingente Elopet',
      description: 'Colar NFC',
      price_cents: 1990,
      active: true,
    })
  })

  it('converte persistência → domínio', () => {
    const model = {
      id: 'prod-1',
      sku: 'pingente',
      name: 'Pingente Elopet',
      description: null,
      price_cents: 1990,
      active: true,
      created_at: new Date('2026-09-01T00:00:00Z'),
      updated_at: new Date('2026-09-02T00:00:00Z'),
    } as ProductModel

    const product = ProductMapper.toDomain(model)

    expect(product.id).toBe('prod-1')
    expect(product.sku).toBe('pingente')
    expect(product.name).toBe('Pingente Elopet')
    expect(product.description).toBeNull()
    expect(product.price.amountInCents).toBe(1990)
    expect(product.active).toBe(true)
  })
})
