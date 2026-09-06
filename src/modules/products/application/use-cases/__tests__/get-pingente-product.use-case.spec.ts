import { GetPingenteProductUseCase } from '../get-pingente-product.use-case'
import type { ProductRepositoryPort } from '../../../domain/repositories/product.repository.port'
import { Product } from '../../../domain/entities/product.entity'
import { Price } from '../../../../../common/value-objects/price.vo'
import { ProductNotFoundError } from '../../errors'

describe('GetPingenteProductUseCase', () => {
  let products: jest.Mocked<ProductRepositoryPort>
  let useCase: GetPingenteProductUseCase

  beforeEach(() => {
    products = {
      findBySku: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
    }
    useCase = new GetPingenteProductUseCase(products)
  })

  it('retorna o produto pingente ativo', async () => {
    const product = Product.create({
      id: 'prod-1',
      sku: 'pingente',
      name: 'Pingente',
      price: Price.create(1990),
    })
    products.findBySku.mockResolvedValue(product)

    await expect(useCase.execute()).resolves.toBe(product)
    expect(products.findBySku).toHaveBeenCalledWith('pingente')
  })

  it('lança 404 quando não existe', async () => {
    products.findBySku.mockResolvedValue(null)
    await expect(useCase.execute()).rejects.toThrow(ProductNotFoundError)
  })

  it('lança 404 quando inativo', async () => {
    const product = Product.create({
      id: 'prod-1',
      sku: 'pingente',
      name: 'Pingente',
      price: Price.create(1990),
      active: false,
    })
    products.findBySku.mockResolvedValue(product)

    await expect(useCase.execute()).rejects.toThrow(ProductNotFoundError)
  })
})
