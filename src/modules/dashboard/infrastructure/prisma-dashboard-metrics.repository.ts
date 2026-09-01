import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../infrastructure/database/prisma.service'
import type { DateRange } from '../domain/value-objects/date-range.vo'
import type {
  ContactMetrics,
  DashboardMetricsPort,
  Granularity,
  NfcMetrics,
  PaymentMetrics,
  PetMetrics,
  ScanMetrics,
  SeriesPoint,
  SubscriptionMetrics,
  TimeseriesMetric,
  UserMetrics,
} from '../domain/repositories/dashboard-metrics.port'

const DAY_MS = 86_400_000

/**
 * Filtro de "cliente" (role USER). As métricas de "Tutores" representam a
 * base de clientes finais — staff (ADMIN/OPERATOR/SUPPORT/SUPER_ADMIN) fica de
 * fora. Todo cliente cadastrado ganha role USER no `RegisterUserUseCase`.
 */
const CLIENT_ROLE_WHERE = {
  roles: { some: { role: { name: 'USER' } } },
} as const

/**
 * Implementação concreta do `DashboardMetricsPort` (read model) usando Prisma 7.
 *
 * As contagens simples usam o query builder do Prisma; os agregados que exigem
 * `COUNT(DISTINCT ...)`, join (top pets) ou `date_trunc` (séries temporais)
 * usam `$queryRaw` com SQL parametrizado.
 *
 * Importante (Prisma 7): os campos de data são `timestamp without time zone`
 * e o app grava tudo em UTC "naive". Por isso as cláusulas `WHERE` dos raw
 * queries recebem a data como **string naive UTC** (`YYYY-MM-DD HH:MM:SS`) —
 * evita qualquer conversão de fuso implícita do Postgres.
 */
@Injectable()
export class PrismaDashboardMetricsRepository implements DashboardMetricsPort {
  constructor(private readonly prisma: PrismaService) {}

  async countUsers(range: DateRange): Promise<UserMetrics> {
    const [
      total,
      newCount,
      active,
      blocked,
      pendingVerification,
      verifiedEmail,
      premium,
    ] = await Promise.all([
      this.prisma.user.count({
        where: { deleted_at: null, ...CLIENT_ROLE_WHERE },
      }),
      this.prisma.user.count({
        where: {
          deleted_at: null,
          ...CLIENT_ROLE_WHERE,
          created_at: { gte: range.from, lte: range.to },
        },
      }),
      this.prisma.user.count({
        where: { deleted_at: null, ...CLIENT_ROLE_WHERE, status: 'ACTIVE' },
      }),
      this.prisma.user.count({
        where: { deleted_at: null, ...CLIENT_ROLE_WHERE, status: 'BLOCKED' },
      }),
      this.prisma.user.count({
        where: {
          deleted_at: null,
          ...CLIENT_ROLE_WHERE,
          status: 'PENDING_VERIFICATION',
        },
      }),
      this.prisma.user.count({
        where: {
          deleted_at: null,
          ...CLIENT_ROLE_WHERE,
          email_verified_at: { not: null },
        },
      }),
      this.prisma.user.count({
        where: {
          deleted_at: null,
          ...CLIENT_ROLE_WHERE,
          subscriptions: {
            some: {
              status: { in: ['ACTIVE', 'TRIALING'] },
              plan: { code: 'PREMIUM' },
            },
          },
        },
      }),
    ])

    return {
      total,
      new: newCount,
      active,
      blocked,
      pendingVerification,
      verifiedEmail,
      premium,
    }
  }

  async countPets(range: DateRange): Promise<PetMetrics> {
    const [total, newCount, lost, withPhoto, speciesGroups] = await Promise.all(
      [
        this.prisma.pet.count({ where: { deleted_at: null } }),
        this.prisma.pet.count({
          where: {
            deleted_at: null,
            created_at: { gte: range.from, lte: range.to },
          },
        }),
        this.prisma.pet.count({
          where: { deleted_at: null, lost_status: true },
        }),
        this.prisma.pet.count({
          where: { deleted_at: null, photo_url: { not: null } },
        }),
        this.prisma.pet.groupBy({
          by: ['species'],
          where: { deleted_at: null },
          _count: { _all: true },
        }),
      ],
    )

    const bySpecies: Record<string, number> = {}
    for (const group of speciesGroups) {
      bySpecies[group.species] = group._count._all
    }

    return { total, new: newCount, lost, withPhoto, bySpecies }
  }

  async subscriptionStats(range: DateRange): Promise<SubscriptionMetrics> {
    const now = new Date()
    const in7d = new Date(now.getTime() + 7 * DAY_MS)
    const in30d = new Date(now.getTime() + 30 * DAY_MS)

    const [statusGroups, newCount, churn, renewals7d, renewals30d, activeSubs] =
      await Promise.all([
        this.prisma.subscription.groupBy({
          by: ['status'],
          _count: { _all: true },
        }),
        this.prisma.subscription.count({
          where: { started_at: { gte: range.from, lte: range.to } },
        }),
        this.prisma.subscription.count({
          where: { cancelled_at: { gte: range.from, lte: range.to } },
        }),
        this.prisma.subscription.count({
          where: {
            status: 'ACTIVE',
            current_period_end: { gte: now, lte: in7d },
          },
        }),
        this.prisma.subscription.count({
          where: {
            status: 'ACTIVE',
            current_period_end: { gte: now, lte: in30d },
          },
        }),
        this.prisma.subscription.findMany({
          where: { status: { in: ['ACTIVE', 'TRIALING'] } },
          select: {
            plan: { select: { code: true, price_cents: true, interval: true } },
          },
        }),
      ])

    const statusMap: Map<string, number> = new Map(
      statusGroups.map(g => [g.status, g._count._all]),
    )
    const count = (status: string): number => statusMap.get(status) ?? 0

    let mrrCents = 0
    let premiumCount = 0
    let basicCount = 0
    for (const sub of activeSubs) {
      const price = sub.plan.price_cents
      mrrCents +=
        sub.plan.interval === 'YEARLY' ? Math.round(price / 12) : price
      if (sub.plan.code === 'PREMIUM') premiumCount += 1
      if (sub.plan.code === 'BASIC') basicCount += 1
    }

    return {
      active: count('ACTIVE'),
      trialing: count('TRIALING'),
      pastDue: count('PAST_DUE'),
      cancelled: count('CANCELLED'),
      expired: count('EXPIRED'),
      new: newCount,
      churn,
      mrrCents,
      premiumCount,
      basicCount,
      upcomingRenewals7d: renewals7d,
      upcomingRenewals30d: renewals30d,
    }
  }

  async paymentStats(range: DateRange): Promise<PaymentMetrics> {
    const [approvedAgg, pendingCount, rejectedCount, totalCount] =
      await Promise.all([
        this.prisma.paymentTransaction.aggregate({
          where: {
            status: 'APPROVED',
            created_at: { gte: range.from, lte: range.to },
          },
          _sum: { amount_cents: true },
          _avg: { amount_cents: true },
          _count: { _all: true },
        }),
        this.prisma.paymentTransaction.count({
          where: {
            status: 'PENDING',
            created_at: { gte: range.from, lte: range.to },
          },
        }),
        this.prisma.paymentTransaction.count({
          where: {
            status: 'REJECTED',
            created_at: { gte: range.from, lte: range.to },
          },
        }),
        this.prisma.paymentTransaction.count({
          where: { created_at: { gte: range.from, lte: range.to } },
        }),
      ])

    const approvedCount = approvedAgg._count._all
    const revenueCents = approvedAgg._sum.amount_cents ?? 0
    const avgTicketCents = Math.round(approvedAgg._avg.amount_cents ?? 0)
    const conversionRate =
      totalCount === 0
        ? 0
        : Math.round((approvedCount / totalCount) * 100) / 100

    return {
      revenueCents,
      approvedCount,
      pendingCount,
      rejectedCount,
      avgTicketCents,
      conversionRate,
    }
  }

  async scanStats(range: DateRange): Promise<ScanMetrics> {
    const from = this.toNaiveTimestamp(range.from)
    const to = this.toNaiveTimestamp(range.to)

    const [total, uniquePetsRows, uniqueVisitorsRows, sourceGroups, topPets] =
      await Promise.all([
        this.prisma.accessEvent.count({
          where: { created_at: { gte: range.from, lte: range.to } },
        }),
        this.prisma.$queryRaw<Array<{ count: number }>>`
          SELECT COUNT(DISTINCT pet_id)::int AS count
          FROM access_events
          WHERE created_at >= ${from}::timestamp
            AND created_at <= ${to}::timestamp
            AND pet_id IS NOT NULL
        `,
        this.prisma.$queryRaw<Array<{ count: number }>>`
          SELECT COUNT(DISTINCT ip_hash)::int AS count
          FROM access_events
          WHERE created_at >= ${from}::timestamp
            AND created_at <= ${to}::timestamp
            AND ip_hash IS NOT NULL
        `,
        this.prisma.accessEvent.groupBy({
          by: ['source'],
          where: { created_at: { gte: range.from, lte: range.to } },
          _count: { _all: true },
        }),
        this.prisma.$queryRaw<
          Array<{ petId: string; name: string; count: number }>
        >`
          SELECT
            ae.pet_id AS "petId",
            COALESCE(p.name, 'Sem nome') AS "name",
            COUNT(*)::int AS "count"
          FROM access_events ae
          LEFT JOIN pets p ON p.id = ae.pet_id
          WHERE ae.created_at >= ${from}::timestamp
            AND ae.created_at <= ${to}::timestamp
            AND ae.pet_id IS NOT NULL
          GROUP BY ae.pet_id, p.name
          ORDER BY COUNT(*) DESC
          LIMIT 5
        `,
      ])

    const bySource: Record<string, number> = {}
    for (const group of sourceGroups) {
      bySource[group.source] = group._count._all
    }

    return {
      total,
      uniquePets: uniquePetsRows[0]?.count ?? 0,
      uniqueVisitors: uniqueVisitorsRows[0]?.count ?? 0,
      bySource,
      topPets,
    }
  }

  async contactStats(range: DateRange): Promise<ContactMetrics> {
    const [total, unread, withLocation] = await Promise.all([
      this.prisma.contactMessage.count({
        where: { created_at: { gte: range.from, lte: range.to } },
      }),
      this.prisma.contactMessage.count({
        where: {
          created_at: { gte: range.from, lte: range.to },
          read_at: null,
        },
      }),
      this.prisma.contactMessage.count({
        where: {
          created_at: { gte: range.from, lte: range.to },
          location_approx: { not: null },
        },
      }),
    ])

    return { total, unread, withLocation }
  }

  async nfcStats(range: DateRange): Promise<NfcMetrics> {
    const [totalTags, activeTags, lostTags, activatedInPeriod, statusGroups] =
      await Promise.all([
        this.prisma.nfcTag.count(),
        this.prisma.nfcTag.count({ where: { status: 'ACTIVE' } }),
        this.prisma.nfcTag.count({ where: { status: 'LOST' } }),
        this.prisma.nfcTag.count({
          where: { activated_at: { gte: range.from, lte: range.to } },
        }),
        this.prisma.nfcTag.groupBy({
          by: ['status'],
          _count: { _all: true },
        }),
      ])

    const byStatus: Record<string, number> = {}
    for (const group of statusGroups) {
      byStatus[group.status] = group._count._all
    }

    return {
      totalTags,
      activeTags,
      lostTags,
      activatedInPeriod,
      byStatus,
    }
  }

  async timeseries(
    metric: TimeseriesMetric,
    range: DateRange,
    granularity: Granularity,
  ): Promise<SeriesPoint[]> {
    switch (metric) {
      case 'signups':
        return this.signupsSeries(range, granularity)
      case 'scans':
        return this.scansSeries(range, granularity)
      case 'revenue':
        return this.revenueSeries(range, granularity)
      case 'newSubscriptions':
        return this.newSubscriptionsSeries(range, granularity)
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Séries temporais (raw SQL com `date_trunc` + `to_char` para bucket estável)
  // ───────────────────────────────────────────────────────────────────────────

  private async signupsSeries(
    range: DateRange,
    granularity: Granularity,
  ): Promise<SeriesPoint[]> {
    const from = this.toNaiveTimestamp(range.from)
    const to = this.toNaiveTimestamp(range.to)
    const interval = this.seriesInterval(granularity)
    const rows = await this.prisma.$queryRaw<
      Array<{ bucket: string; value: number }>
    >`
      SELECT to_char(b.bucket, 'YYYY-MM-DD') AS bucket, COALESCE(d.value, 0) AS value
      FROM generate_series(
        date_trunc(${granularity}::text, ${from}::timestamp),
        date_trunc(${granularity}::text, ${to}::timestamp),
        ${interval}::interval
      ) AS b(bucket)
      LEFT JOIN (
        SELECT date_trunc(${granularity}::text, created_at) AS bucket, COUNT(*)::int AS value
        FROM users
        WHERE created_at >= ${from}::timestamp
          AND created_at <= ${to}::timestamp
          AND deleted_at IS NULL
          AND EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON r.id = ur.role_id
            WHERE ur.user_id = users.id AND r.name = 'USER'
          )
        GROUP BY 1
      ) AS d ON d.bucket = b.bucket
      ORDER BY b.bucket
    `
    return rows
  }

  private async scansSeries(
    range: DateRange,
    granularity: Granularity,
  ): Promise<SeriesPoint[]> {
    const from = this.toNaiveTimestamp(range.from)
    const to = this.toNaiveTimestamp(range.to)
    const interval = this.seriesInterval(granularity)
    const rows = await this.prisma.$queryRaw<
      Array<{ bucket: string; value: number }>
    >`
      SELECT to_char(b.bucket, 'YYYY-MM-DD') AS bucket, COALESCE(d.value, 0) AS value
      FROM generate_series(
        date_trunc(${granularity}::text, ${from}::timestamp),
        date_trunc(${granularity}::text, ${to}::timestamp),
        ${interval}::interval
      ) AS b(bucket)
      LEFT JOIN (
        SELECT date_trunc(${granularity}::text, created_at) AS bucket, COUNT(*)::int AS value
        FROM access_events
        WHERE created_at >= ${from}::timestamp
          AND created_at <= ${to}::timestamp
        GROUP BY 1
      ) AS d ON d.bucket = b.bucket
      ORDER BY b.bucket
    `
    return rows
  }

  private async revenueSeries(
    range: DateRange,
    granularity: Granularity,
  ): Promise<SeriesPoint[]> {
    const from = this.toNaiveTimestamp(range.from)
    const to = this.toNaiveTimestamp(range.to)
    const interval = this.seriesInterval(granularity)
    const rows = await this.prisma.$queryRaw<
      Array<{ bucket: string; value: number }>
    >`
      SELECT to_char(b.bucket, 'YYYY-MM-DD') AS bucket, COALESCE(d.value, 0) AS value
      FROM generate_series(
        date_trunc(${granularity}::text, ${from}::timestamp),
        date_trunc(${granularity}::text, ${to}::timestamp),
        ${interval}::interval
      ) AS b(bucket)
      LEFT JOIN (
        SELECT date_trunc(${granularity}::text, created_at) AS bucket, COALESCE(SUM(amount_cents), 0)::int AS value
        FROM payment_transactions
        WHERE created_at >= ${from}::timestamp
          AND created_at <= ${to}::timestamp
          AND status = 'APPROVED'
        GROUP BY 1
      ) AS d ON d.bucket = b.bucket
      ORDER BY b.bucket
    `
    return rows
  }

  private async newSubscriptionsSeries(
    range: DateRange,
    granularity: Granularity,
  ): Promise<SeriesPoint[]> {
    const from = this.toNaiveTimestamp(range.from)
    const to = this.toNaiveTimestamp(range.to)
    const interval = this.seriesInterval(granularity)
    const rows = await this.prisma.$queryRaw<
      Array<{ bucket: string; value: number }>
    >`
      SELECT to_char(b.bucket, 'YYYY-MM-DD') AS bucket, COALESCE(d.value, 0) AS value
      FROM generate_series(
        date_trunc(${granularity}::text, ${from}::timestamp),
        date_trunc(${granularity}::text, ${to}::timestamp),
        ${interval}::interval
      ) AS b(bucket)
      LEFT JOIN (
        SELECT date_trunc(${granularity}::text, started_at) AS bucket, COUNT(*)::int AS value
        FROM subscriptions
        WHERE started_at >= ${from}::timestamp
          AND started_at <= ${to}::timestamp
        GROUP BY 1
      ) AS d ON d.bucket = b.bucket
      ORDER BY b.bucket
    `
    return rows
  }

  private seriesInterval(granularity: Granularity): string {
    switch (granularity) {
      case 'day':
        return '1 day'
      case 'week':
        return '1 week'
      case 'month':
        return '1 month'
    }
  }

  /**
   * Converte um `Date` (instante UTC) em string naive UTC `YYYY-MM-DD HH:MM:SS`,
   * que é exatamente como os timestamps são gravados nas colunas
   * `timestamp without time zone` do Postgres.
   */
  private toNaiveTimestamp(date: Date): string {
    return date.toISOString().slice(0, 19).replace('T', ' ')
  }
}
