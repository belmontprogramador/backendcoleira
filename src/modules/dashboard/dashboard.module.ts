import { Module } from '@nestjs/common'
import { DASHBOARD_METRICS_PORT } from './domain/repositories/dashboard-metrics.port'
import { PrismaDashboardMetricsRepository } from './infrastructure/prisma-dashboard-metrics.repository'
import { GetDashboardOverviewUseCase } from './application/use-cases/get-dashboard-overview.use-case'
import { AdminDashboardController } from './presentation/controllers/admin-dashboard.controller'

/**
 * Módulo de métricas/KPIs do dashboard administrativo (read model).
 *
 * Não depende de nenhum módulo de domínio — apenas do `PrismaService`
 * (provido globalmente por `DatabaseModule`). Expõe `GET /admin/dashboard`.
 */
@Module({
  controllers: [AdminDashboardController],
  providers: [
    PrismaDashboardMetricsRepository,
    {
      provide: DASHBOARD_METRICS_PORT,
      useClass: PrismaDashboardMetricsRepository,
    },
    GetDashboardOverviewUseCase,
  ],
})
export class DashboardModule {}
