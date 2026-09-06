import { UpdateProductUseCase } from '../update-product.use-case'
import type { ProductRepositoryPort } from '../../../domain/repositories/product.repository.port'
import { Product } from '../../../domain/entities/product.entity'
import { Price } from '../../../../../common/value-objects/price.vo'
import { ProductNotFoundError } from '../../errors'

describe('UpdateProductUseCase', () => {
  let products: jest.Mocked<ProductRepositoryPort>
  let useCase: UpdateProductUseCase

  beforeEach(() => {
    products = {
      findBySku: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
    }
    useCase = new UpdateProductUseCase(products)
  })

  it('atualiza nome e preço', async () => {
    const product = Product.create({
      id: 'prod-1',
      sku: 'pingente',
      name: 'Pingente',
      price: Price.create(1990),
    })
    products.findById.mockResolvedValue(product)
    products.update.mockImplementation(async p => p)

    const result = await useCase.execute('prod-1', {
      name: 'Pingente Premium',
      priceCents: 2990,
    })

    expect(result.name).toBe('Pingente Premium')
    expect(result.price.amountInCents).toBe(2990)
    expect(products.update).toHaveBeenCalled()
  })

  it('atualiza active', async () => {
    const product = Product.create({
      id: 'prod-1',
      sku: 'pingente',
      name: 'Pingente',
      price: Price.create(1990),
    })
    products.findById.mockResolvedValue(product)
    products.update.mockImplementation(async p => p)

    const result = await useCase.execute('prod-1', { active: false })

    expect(result.active).toBe(false)
  })

  it('lança 404 quando não existe', async () => {
    products.findById.mockResolvedValue(null)
    await expect(useCase.execute('x', { name: 'A' })).rejects.toThrow(
      ProductNotFoundError,
    )
  })
})
