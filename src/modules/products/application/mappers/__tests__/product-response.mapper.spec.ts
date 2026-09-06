import { ProductResponseMapper } from '../product-response.mapper'
import { Product } from '../../../domain/entities/product.entity'
import { Price } from '../../../../../common/value-objects/price.vo'

describe('ProductResponseMapper', () => {
  it('projeta para resposta camelCase', () => {
    const product = Product.create({
      id: 'prod-1',
      sku: 'pingente',
      name: 'Pingente Elopet',
      description: 'Colar',
      price: Price.create(1990),
      active: false,
    })

    expect(ProductResponseMapper.toResponse(product)).toEqual({
      id: 'prod-1',
      sku: 'pingente',
      name: 'Pingente Elopet',
      description: 'Colar',
      priceCents: 1990,
      active: false,
    })
  })
})
