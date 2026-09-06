import { Body, Controller, Param, Patch } from '@nestjs/common'
import { UpdateProductUseCase } from '../../application/use-cases/update-product.use-case'
import { ProductResponseMapper } from '../../application/mappers/product-response.mapper'
import { updateProductSchema } from '../../application/dtos/update-product.schema'
import type { UpdateProductDto } from '../../application/dtos/update-product.schema'
import { Roles } from '../../../../common/decorators/roles.decorator'
import { ZodValidationPipe } from '../../../../common/pipes/zod-validation.pipe'

/**
 * Rotas administrativas de produtos (`/admin/products`).
 *
 * - `PATCH /admin/products/:id` — edita nome/descrição/preço/ativo de um produto.
 *   Requer ADMIN (SUPER_ADMIN tem bypass).
 */
@Controller('admin/products')
export class AdminProductsController {
  constructor(private readonly updateProduct: UpdateProductUseCase) {}

  @Patch(':id')
  @Roles('ADMIN')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateProductSchema)) body: UpdateProductDto,
  ) {
    const product = await this.updateProduct.execute(id, body)
    return ProductResponseMapper.toResponse(product)
  }
}
