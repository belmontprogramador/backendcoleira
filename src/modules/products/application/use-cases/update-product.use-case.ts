import { Inject, Injectable } from '@nestjs/common'
import { PRODUCT_REPOSITORY_PORT } from '../../domain/repositories/product.repository.port'
import type { ProductRepositoryPort } from '../../domain/repositories/product.repository.port'
import type { Product } from '../../domain/entities/product.entity'
import { Price } from '../../../../common/value-objects/price.vo'
import { ProductNotFoundError } from '../errors'
import type { UpdateProductDto } from '../dtos/update-product.schema'

/**
 * Caso de uso: atualizar um produto (nome, descrição, preço e/ou ativo).
 * Apenas campos editáveis são mutados; `sku` é imutável.
 */
@Injectable()
export class UpdateProductUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY_PORT)
    private readonly products: ProductRepositoryPort,
  ) {}

  async execute(id: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.products.findById(id)
    if (!product) {
      throw new ProductNotFoundError()
    }

    product.updateDetails({
      name: dto.name,
      description: dto.description,
      price:
        dto.priceCents !== undefined ? Price.create(dto.priceCents) : undefined,
      active: dto.active,
    })

    return this.products.update(product)
  }
}
