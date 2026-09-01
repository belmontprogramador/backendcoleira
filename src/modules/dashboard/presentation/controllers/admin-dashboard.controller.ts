import { Controller, Get, Query } from '@nestjs/common'
import { GetDashboardOverviewUseCase } from '../../application/use-cases/get-dashboard-overview.use-case'
import { DashboardResponseMapper } from '../../application/mappers/dashboard-response.mapper'
import { dashboardQuerySchema } from '../../application/dtos/dashboard-query.schema'
import type { DashboardQueryDto } from '../../application/dtos/dashboard-query.schema'
import { Roles } from '../../../../common/decorators/roles.decorator'
import { ZodValidationPipe } from '../../../../common/pipes/zod-validation.pipe'

/**
 * Rotas administrativas de métricas (`/admin/dashboard`).
 *
 * - `GET /admin/dashboard` → visão agregada (KPIs + séries temporais) com
 *   filtro de período (`from`/`to`) e granularidade. Requer ADMIN.
 */
@Controller('admin/dashboard')
export class AdminDashboardController {
  constructor(private readonly getOverview: GetDashboardOverviewUseCase) {}

  @Get()
  @Roles('ADMIN')
  async overview(
    @Query(new ZodValidationPipe(dashboardQuerySchema))
    query: DashboardQueryDto,
  ) {
    const result = await this.getOverview.execute(query)
    return DashboardResponseMapper.toResponse(result)
  }
}
