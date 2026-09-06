import { Product } from '../../domain/entities/product.entity'
import { Price } from '../../../../common/value-objects/price.vo'
import type { ProductModel } from '../../../../generated/prisma/models/Product'

/**
 * Converte a entidade `Product` (domínio) para o formato de persistência Prisma
 * (snake_case) e vice-versa. O preço é armazenado em centavos (BRL).
 */
export class ProductMapper {
  static toPersistence(product: Product): {
    id: string
    sku: string
    name: string
    description: string | null
    price_cents: number
    active: boolean
    created_at: Date
    updated_at: Date
  } {
    return {
      id: product.id,
      sku: product.sku,
      name: product.name,
      description: product.description,
      price_cents: product.price.amountInCents,
      active: product.active,
      created_at: product.createdAt,
      updated_at: product.updatedAt,
    }
  }

  static toDomain(model: ProductModel): Product {
    return Product.reconstitute({
      id: model.id,
      sku: model.sku,
      name: model.name,
      description: model.description,
      price: Price.create(model.price_cents),
      active: model.active,
      createdAt: model.created_at,
      updatedAt: model.updated_at,
    })
  }
}
