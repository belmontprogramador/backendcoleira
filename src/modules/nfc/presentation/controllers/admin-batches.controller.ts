import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common'
import { CreateBatchUseCase } from '../../application/use-cases/create-batch.use-case'
import { GenerateTagsUseCase } from '../../application/use-cases/generate-tags.use-case'
import { CompleteBatchUseCase } from '../../application/use-cases/complete-batch.use-case'
import { CancelBatchUseCase } from '../../application/use-cases/cancel-batch.use-case'
import { GetBatchUseCase } from '../../application/use-cases/get-batch.use-case'
import { BatchResponseMapper } from '../../application/mappers/batch-response.mapper'
import { createBatchSchema } from '../../application/dtos/create-batch.schema'
import type { CreateBatchDto } from '../../application/dtos/create-batch.schema'
import { cancelBatchSchema } from '../../application/dtos/cancel-batch.schema'
import type { CancelBatchDto } from '../../application/dtos/cancel-batch.schema'
import { Permissions } from '../../../../common/decorators/permissions.decorator'
import { CurrentUser } from '../../../../common/decorators/current-user.decorator'
import type { RequestUser } from '../../../../common/decorators/current-user.decorator'
import { ZodValidationPipe } from '../../../../common/pipes/zod-validation.pipe'

/**
 * Rotas administrativas de lotes (`/admin/batches`).
 */
@Controller('admin/batches')
export class AdminBatchesController {
  constructor(
    private readonly createBatch: CreateBatchUseCase,
    private readonly getBatch: GetBatchUseCase,
    private readonly generateTags: GenerateTagsUseCase,
    private readonly completeBatch: CompleteBatchUseCase,
    private readonly cancelBatch: CancelBatchUseCase,
  ) {}

  @Post()
  @Permissions('batch:manage')
  async create(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(createBatchSchema)) body: CreateBatchDto,
  ) {
    const batch = await this.createBatch.execute(user.sub, body)
    return BatchResponseMapper.toResponse(batch)
  }

  @Get(':id')
  @Permissions('tag:read')
  async detail(@Param('id') id: string) {
    const batch = await this.getBatch.execute(id)
    return BatchResponseMapper.toResponse(batch)
  }

  @Post(':id/generate')
  @Permissions('batch:manage')
  async generate(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    const result = await this.generateTags.execute(user.sub, id)
    // ⚠️ Códigos em texto puro: retornados UMA única vez para a etiqueta.
    // NUNCA persistidos nem logados.
    return {
      count: result.tags.length,
      codes: result.codes,
    }
  }

  @Post(':id/complete')
  @Permissions('batch:manage')
  async complete(@Param('id') id: string) {
    const batch = await this.completeBatch.execute(id)
    return BatchResponseMapper.toResponse(batch)
  }

  @Delete(':id')
  @Permissions('batch:manage')
  async cancel(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(cancelBatchSchema)) body: CancelBatchDto,
  ) {
    const batch = await this.cancelBatch.execute(id, body.reason)
    return BatchResponseMapper.toResponse(batch)
  }
}
