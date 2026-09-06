import { Controller, Get } from '@nestjs/common'
import { GetPingenteProductUseCase } from '../../application/use-cases/get-pingente-product.use-case'
import { ProductResponseMapper } from '../../application/mappers/product-response.mapper'
import { Public } from '../../../../common/decorators/public.decorator'

/**
 * Rota pública do catálogo de produtos (`GET /products/pingente`).
 * Retorna o produto "pingente" com preço dinâmico (vem do banco).
 */
@Controller('products')
export class ProductsController {
  constructor(private readonly getPingente: GetPingenteProductUseCase) {}

  @Public()
  @Get('pingente')
  async pingente() {
    const product = await this.getPingente.execute()
    return ProductResponseMapper.toResponse(product)
  }
}
