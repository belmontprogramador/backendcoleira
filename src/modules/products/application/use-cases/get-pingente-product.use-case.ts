import { Inject, Injectable } from '@nestjs/common'
import { PRODUCT_REPOSITORY_PORT } from '../../domain/repositories/product.repository.port'
import type { ProductRepositoryPort } from '../../domain/repositories/product.repository.port'
import type { Product } from '../../domain/entities/product.entity'
import { ProductNotFoundError } from '../errors'

/**
 * Caso de uso: busca o produto "pingente" ativo para exibição no checkout.
 *
 * Usa `sku` fixo (`"pingente"`) — o preço é dinâmico (vem do banco). Se o
 * produto não existir ou estiver inativo, retorna 404 (não expõe ao público).
 */
@Injectable()
export class GetPingenteProductUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY_PORT)
    private readonly products: ProductRepositoryPort,
  ) {}

  async execute(): Promise<Product> {
    const product = await this.products.findBySku('pingente')
    if (!product || !product.active) {
      throw new ProductNotFoundError()
    }
    return product
  }
}
