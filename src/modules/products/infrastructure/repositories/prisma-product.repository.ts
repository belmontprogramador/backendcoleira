import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../../infrastructure/database/prisma.service'
import type { Product } from '../../domain/entities/product.entity'
import type { ProductRepositoryPort } from '../../domain/repositories/product.repository.port'
import { ProductMapper } from '../mappers/product.mapper'

/**
 * Implementação concreta do `ProductRepositoryPort` usando Prisma 7.
 */
@Injectable()
export class PrismaProductRepository implements ProductRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findBySku(sku: string): Promise<Product | null> {
    const model = await this.prisma.product.findUnique({ where: { sku } })
    return model ? ProductMapper.toDomain(model) : null
  }

  async findById(id: string): Promise<Product | null> {
    const model = await this.prisma.product.findUnique({ where: { id } })
    return model ? ProductMapper.toDomain(model) : null
  }

  async update(product: Product): Promise<Product> {
    const model = await this.prisma.product.update({
      where: { id: product.id },
      data: {
        name: product.name,
        description: product.description,
        price_cents: product.price.amountInCents,
        active: product.active,
      },
    })
    return ProductMapper.toDomain(model)
  }
}
