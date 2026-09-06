import type { Product } from '../../domain/entities/product.entity'

export interface ProductResponse {
  id: string
  sku: string
  name: string
  description: string | null
  priceCents: number
  active: boolean
}

/**
 * Projeta a entidade `Product` para a resposta HTTP (camelCase).
 */
export class ProductResponseMapper {
  static toResponse(product: Product): ProductResponse {
    return {
      id: product.id,
      sku: product.sku,
      name: product.name,
      description: product.description,
      priceCents: product.price.amountInCents,
      active: product.active,
    }
  }
}
