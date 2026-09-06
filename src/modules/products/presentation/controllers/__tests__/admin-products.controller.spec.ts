import { AdminProductsController } from '../admin-products.controller'
import { UpdateProductUseCase } from '../../../application/use-cases/update-product.use-case'
import { Product } from '../../../domain/entities/product.entity'
import { Price } from '../../../../../common/value-objects/price.vo'

describe('AdminProductsController', () => {
  it('atualiza e retorna o produto mapeado', async () => {
    const product = Product.create({
      id: 'prod-1',
      sku: 'pingente',
      name: 'Pingente',
      price: Price.create(1990),
    })
    const updateProduct = {
      execute: jest.fn().mockResolvedValue(product),
    } as unknown as UpdateProductUseCase

    const controller = new AdminProductsController(updateProduct)
    const result = await controller.update('prod-1', { name: 'Novo' })

    expect(updateProduct.execute).toHaveBeenCalledWith('prod-1', { name: 'Novo' })
    expect(result.name).toBe('Pingente')
  })
})
