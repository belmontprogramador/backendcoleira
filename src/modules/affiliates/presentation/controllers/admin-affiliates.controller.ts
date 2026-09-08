import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common'
import { CreateAffiliateUseCase } from '../../application/use-cases/create-affiliate.use-case'
import { UpdateAffiliateUseCase } from '../../application/use-cases/update-affiliate.use-case'
import { SetAffiliateStatusUseCase } from '../../application/use-cases/set-affiliate-status.use-case'
import { ListAffiliatesUseCase } from '../../application/use-cases/list-affiliates.use-case'
import { GetAffiliateUseCase } from '../../application/use-cases/get-affiliate.use-case'
import { GetAffiliateMetricsUseCase } from '../../application/use-cases/get-affiliate-metrics.use-case'
import { AffiliateResponseMapper } from '../../application/mappers/affiliate-response.mapper'
import { createAffiliateSchema } from '../../application/dtos/create-affiliate.schema'
import type { CreateAffiliateDto } from '../../application/dtos/create-affiliate.schema'
import { updateAffiliateSchema } from '../../application/dtos/update-affiliate.schema'
import type { UpdateAffiliateDto } from '../../application/dtos/update-affiliate.schema'
import { setAffiliateStatusSchema } from '../../application/dtos/set-affiliate-status.schema'
import type { SetAffiliateStatusDto } from '../../application/dtos/set-affiliate-status.schema'
import { listAffiliatesSchema } from '../../application/dtos/list-affiliates.schema'
import type { ListAffiliatesDto } from '../../application/dtos/list-affiliates.schema'
import { Roles } from '../../../../common/decorators/roles.decorator'
import { ZodValidationPipe } from '../../../../common/pipes/zod-validation.pipe'

/**
 * Rotas administrativas de afiliados (`/admin/affiliates`).
 * Requerem ADMIN (SUPER_ADMIN tem bypass via `RolesGuard`).
 */
@Controller('admin/affiliates')
export class AdminAffiliatesController {
  constructor(
    private readonly createUseCase: CreateAffiliateUseCase,
    private readonly updateUseCase: UpdateAffiliateUseCase,
    private readonly setStatusUseCase: SetAffiliateStatusUseCase,
    private readonly listUseCase: ListAffiliatesUseCase,
    private readonly getUseCase: GetAffiliateUseCase,
    private readonly metricsUseCase: GetAffiliateMetricsUseCase,
  ) {}

  @Post()
  @Roles('ADMIN')
  async create(
    @Body(new ZodValidationPipe(createAffiliateSchema))
    body: CreateAffiliateDto,
  ) {
    const affiliate = await this.createUseCase.execute(body)
    return AffiliateResponseMapper.toResponse(affiliate)
  }

  @Get()
  @Roles('ADMIN')
  async list(
    @Query(new ZodValidationPipe(listAffiliatesSchema)) query: ListAffiliatesDto,
  ) {
    const { data, total, page, limit } = await this.listUseCase.execute(query)
    return {
      data: data.map(AffiliateResponseMapper.toResponse),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    }
  }

  @Get(':id')
  @Roles('ADMIN')
  async detail(@Param('id') id: string) {
    const affiliate = await this.getUseCase.execute(id)
    return AffiliateResponseMapper.toResponse(affiliate)
  }

  @Patch(':id')
  @Roles('ADMIN')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateAffiliateSchema)) body: UpdateAffiliateDto,
  ) {
    const affiliate = await this.updateUseCase.execute(id, body)
    return AffiliateResponseMapper.toResponse(affiliate)
  }

  @Patch(':id/status')
  @Roles('ADMIN')
  async setStatus(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(setAffiliateStatusSchema))
    body: SetAffiliateStatusDto,
  ) {
    const affiliate = await this.setStatusUseCase.execute(id, body.status)
    return AffiliateResponseMapper.toResponse(affiliate)
  }

  @Get(':id/metrics')
  @Roles('ADMIN')
  async metrics(@Param('id') id: string) {
    return this.metricsUseCase.execute(id)
  }
}
