import { Inject, Injectable } from '@nestjs/common'
import {
  DASHBOARD_METRICS_PORT,
  type ContactMetrics,
  type DashboardMetricsPort,
  type Granularity,
  type NfcMetrics,
  type PaymentMetrics,
  type PetMetrics,
  type ScanMetrics,
  type SeriesPoint,
  type SubscriptionMetrics,
  type UserMetrics,
} from '../../domain/repositories/dashboard-metrics.port'
import {
  DateRange,
  DEFAULT_RANGE_DAYS,
  DAY_MS,
} from '../../domain/value-objects/date-range.vo'
import type { DashboardQueryDto } from '../dtos/dashboard-query.schema'

export interface DashboardKpis {
  users: UserMetrics
  pets: PetMetrics
  subscriptions: SubscriptionMetrics
  payments: PaymentMetrics
  scans: ScanMetrics
  contacts: ContactMetrics
  nfc: NfcMetrics
}

export interface DashboardTimeseries {
  signups: SeriesPoint[]
  scans: SeriesPoint[]
  revenue: SeriesPoint[]
  newSubscriptions: SeriesPoint[]
}

export interface DashboardOverviewResult {
  range: DateRange
  granularity: Granularity
  kpis: DashboardKpis
  timeseries: DashboardTimeseries
}

/**
 * Caso de uso (admin): monta a visão agregada do dashboard.
 *
 * Orquestra todas as agregações da porta `DashboardMetricsPort` em paralelo
 * (sem N+1) e devolve KPIs + séries temporais. O período default é os
 * últimos 30 dias (`DEFAULT_RANGE_DAYS`), ancorado em `to` (ou em `now`).
 */
@Injectable()
export class GetDashboardOverviewUseCase {
  constructor(
    @Inject(DASHBOARD_METRICS_PORT)
    private readonly metrics: DashboardMetricsPort,
  ) {}

  async execute(query: DashboardQueryDto): Promise<DashboardOverviewResult> {
    const to = query.to ?? new Date()
    const from =
      query.from ?? new Date(to.getTime() - DEFAULT_RANGE_DAYS * DAY_MS)
    const range = DateRange.create(from, to)
    const granularity = query.granularity

    const [
      users,
      pets,
      subscriptions,
      payments,
      scans,
      contacts,
      nfc,
      signups,
      scansSeries,
      revenue,
      newSubscriptions,
    ] = await Promise.all([
      this.metrics.countUsers(range),
      this.metrics.countPets(range),
      this.metrics.subscriptionStats(range),
      this.metrics.paymentStats(range),
      this.metrics.scanStats(range),
      this.metrics.contactStats(range),
      this.metrics.nfcStats(range),
      this.metrics.timeseries('signups', range, granularity),
      this.metrics.timeseries('scans', range, granularity),
      this.metrics.timeseries('revenue', range, granularity),
      this.metrics.timeseries('newSubscriptions', range, granularity),
    ])

    return {
      range,
      granularity,
      kpis: { users, pets, subscriptions, payments, scans, contacts, nfc },
      timeseries: { signups, scans: scansSeries, revenue, newSubscriptions },
    }
  }
}
