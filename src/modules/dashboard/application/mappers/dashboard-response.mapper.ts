import type {
  DashboardKpis,
  DashboardOverviewResult,
  DashboardTimeseries,
} from '../use-cases/get-dashboard-overview.use-case'
import type { SeriesPoint } from '../../domain/repositories/dashboard-metrics.port'

export interface RevenueSeriesPoint {
  bucket: string
  valueCents: number
}

export interface DashboardOverviewResponse {
  period: {
    from: string
    to: string
    granularity: string
    days: number
  }
  kpis: DashboardKpis
  timeseries: {
    signups: SeriesPoint[]
    scans: SeriesPoint[]
    revenue: RevenueSeriesPoint[]
    newSubscriptions: SeriesPoint[]
  }
}

/**
 * Projeção do `DashboardOverviewResult` para o contrato HTTP (camelCase).
 *
 * Único ajuste além do `period`: a série de receita renomeia `value` →
 * `valueCents` (o valor já é em centavos, mas o contrato deixa explícito).
 */
export class DashboardResponseMapper {
  static toResponse(
    result: DashboardOverviewResult,
  ): DashboardOverviewResponse {
    return {
      period: {
        from: result.range.from.toISOString(),
        to: result.range.to.toISOString(),
        granularity: result.granularity,
        days: result.range.days,
      },
      kpis: result.kpis,
      timeseries: {
        signups: result.timeseries.signups,
        scans: result.timeseries.scans,
        revenue: result.timeseries.revenue.map(point => ({
          bucket: point.bucket,
          valueCents: point.value,
        })),
        newSubscriptions: result.timeseries.newSubscriptions,
      },
    }
  }
}
