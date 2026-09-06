import { ProductsController } from '../products.controller'
import { GetPingenteProductUseCase } from '../../../application/use-cases/get-pingente-product.use-case'
import { Product } from '../../../domain/entities/product.entity'
import { Price } from '../../../../../common/value-objects/price.vo'

describe('ProductsController', () => {
  it('retorna o produto pingente mapeado', async () => {
    const product = Product.create({
      id: 'prod-1',
      sku: 'pingente',
      name: 'Pingente Elopet',
      price: Price.create(1990),
    })
    const getPingente = {
      execute: jest.fn().mockResolvedValue(product),
    } as unknown as GetPingenteProductUseCase

    const controller = new ProductsController(getPingente)
    const result = await controller.pingente()

    expect(result).toEqual({
      id: 'prod-1',
      sku: 'pingente',
      name: 'Pingente Elopet',
      description: null,
      priceCents: 1990,
      active: true,
    })
  })
})
