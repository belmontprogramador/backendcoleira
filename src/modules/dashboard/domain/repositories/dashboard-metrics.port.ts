import type { DateRange } from '../value-objects/date-range.vo'

/**
 * Granularidade das séries temporais do dashboard.
 * Mapeia para `date_trunc` no Postgres (`day`/`week`/`month`).
 */
export const GRANULARITY_VALUES = ['day', 'week', 'month'] as const
export type Granularity = (typeof GRANULARITY_VALUES)[number]

// ─────────────────────────────────────────────────────────────────────────────
// Read models (DTOs de agregação) — retornados pela porta.
// ─────────────────────────────────────────────────────────────────────────────

export interface UserMetrics {
  total: number
  new: number
  active: number
  blocked: number
  pendingVerification: number
  verifiedEmail: number
  premium: number
}

export interface PetMetrics {
  total: number
  new: number
  lost: number
  withPhoto: number
  bySpecies: Record<string, number>
}

export interface SubscriptionMetrics {
  active: number
  trialing: number
  pastDue: number
  cancelled: number
  expired: number
  new: number
  churn: number
  mrrCents: number
  premiumCount: number
  basicCount: number
  upcomingRenewals7d: number
  upcomingRenewals30d: number
}

export interface PaymentMetrics {
  revenueCents: number
  approvedCount: number
  pendingCount: number
  rejectedCount: number
  avgTicketCents: number
  conversionRate: number
}

export interface ScanMetrics {
  total: number
  uniquePets: number
  uniqueVisitors: number
  bySource: Record<string, number>
  topPets: Array<{ petId: string; name: string; count: number }>
}

export interface ContactMetrics {
  total: number
  unread: number
  withLocation: number
}

export interface NfcMetrics {
  totalTags: number
  activeTags: number
  lostTags: number
  activatedInPeriod: number
  byStatus: Record<string, number>
}

export type TimeseriesMetric =
  'signups' | 'scans' | 'revenue' | 'newSubscriptions'

export interface SeriesPoint {
  bucket: string
  value: number
}

/**
 * Porta de métricas do dashboard (read model).
 *
 * Cada método retorna um DTO de agregação — nenhum acopla à entidade de
 * domínio. Implementação concreta em `PrismaDashboardMetricsRepository`.
 */
export interface DashboardMetricsPort {
  countUsers(range: DateRange): Promise<UserMetrics>
  countPets(range: DateRange): Promise<PetMetrics>
  subscriptionStats(range: DateRange): Promise<SubscriptionMetrics>
  paymentStats(range: DateRange): Promise<PaymentMetrics>
  scanStats(range: DateRange): Promise<ScanMetrics>
  contactStats(range: DateRange): Promise<ContactMetrics>
  nfcStats(range: DateRange): Promise<NfcMetrics>
  timeseries(
    metric: TimeseriesMetric,
    range: DateRange,
    granularity: Granularity,
  ): Promise<SeriesPoint[]>
}

export const DASHBOARD_METRICS_PORT = Symbol('DASHBOARD_METRICS_PORT')
