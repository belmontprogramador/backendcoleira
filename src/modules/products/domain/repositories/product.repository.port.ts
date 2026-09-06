import type { Product } from '../entities/product.entity'

/**
 * Porta do repositório de produtos (catálogo de venda — pingente).
 * DIP: domínio/aplicação dependem desta interface; a implementação (Prisma)
 * vive na infraestrutura.
 */
export interface ProductRepositoryPort {
  findBySku(sku: string): Promise<Product | null>
  findById(id: string): Promise<Product | null>
  update(product: Product): Promise<Product>
}

export const PRODUCT_REPOSITORY_PORT = Symbol('PRODUCT_REPOSITORY_PORT')
