import { Module } from '@nestjs/common'
import { PRODUCT_REPOSITORY_PORT } from './domain/repositories/product.repository.port'
import { PrismaProductRepository } from './infrastructure/repositories/prisma-product.repository'
import { GetPingenteProductUseCase } from './application/use-cases/get-pingente-product.use-case'
import { UpdateProductUseCase } from './application/use-cases/update-product.use-case'
import { ProductsController } from './presentation/controllers/products.controller'
import { AdminProductsController } from './presentation/controllers/admin-products.controller'

/**
 * Módulo de produtos (catálogo de venda — pingente).
 * Provê a implementação concreta atrás da porta (DIP) e exporta a porta para
 * consumo por outros módulos (ex.: `orders` na V.4).
 */
@Module({
  controllers: [ProductsController, AdminProductsController],
  providers: [
    PrismaProductRepository,
    { provide: PRODUCT_REPOSITORY_PORT, useClass: PrismaProductRepository },
    GetPingenteProductUseCase,
    UpdateProductUseCase,
  ],
  exports: [PRODUCT_REPOSITORY_PORT],
})
export class ProductsModule {}
