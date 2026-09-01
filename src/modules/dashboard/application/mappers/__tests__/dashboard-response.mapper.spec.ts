import { DashboardResponseMapper } from '../dashboard-response.mapper'
import { DateRange } from '../../../domain/value-objects/date-range.vo'
import type { DashboardOverviewResult } from '../../use-cases/get-dashboard-overview.use-case'

const range = DateRange.create(
  new Date('2026-08-01T00:00:00.000Z'),
  new Date('2026-08-31T00:00:00.000Z'),
)

function makeResult(): DashboardOverviewResult {
  return {
    range,
    granularity: 'day',
    kpis: {
      users: {
        total: 1,
        new: 1,
        active: 1,
        blocked: 0,
        pendingVerification: 0,
        verifiedEmail: 1,
        premium: 1,
      },
      pets: { total: 1, new: 0, lost: 0, withPhoto: 0, bySpecies: { Cão: 1 } },
      subscriptions: {
        active: 1,
        trialing: 0,
        pastDue: 0,
        cancelled: 0,
        expired: 0,
        new: 0,
        churn: 0,
        mrrCents: 1990,
        premiumCount: 1,
        basicCount: 0,
        upcomingRenewals7d: 0,
        upcomingRenewals30d: 0,
      },
      payments: {
        revenueCents: 1990,
        approvedCount: 1,
        pendingCount: 0,
        rejectedCount: 0,
        avgTicketCents: 1990,
        conversionRate: 1,
      },
      scans: {
        total: 1,
        uniquePets: 1,
        uniqueVisitors: 1,
        bySource: { NFC: 1 },
        topPets: [{ petId: 'p1', name: 'Thor', count: 1 }],
      },
      contacts: { total: 1, unread: 1, withLocation: 1 },
      nfc: {
        totalTags: 1,
        activeTags: 1,
        lostTags: 0,
        activatedInPeriod: 0,
        byStatus: { ACTIVE: 1 },
      },
    },
    timeseries: {
      signups: [{ bucket: '2026-08-01', value: 1 }],
      scans: [{ bucket: '2026-08-01', value: 1 }],
      revenue: [{ bucket: '2026-08-01', value: 1990 }],
      newSubscriptions: [{ bucket: '2026-08-01', value: 1 }],
    },
  }
}

describe('DashboardResponseMapper', () => {
  it('projeta period + kpis + séries (revenue → valueCents)', () => {
    const response = DashboardResponseMapper.toResponse(makeResult())

    expect(response.period).toEqual({
      from: '2026-08-01T00:00:00.000Z',
      to: '2026-08-31T00:00:00.000Z',
      granularity: 'day',
      days: 30,
    })
    expect(response.kpis.users.total).toBe(1)
    expect(response.kpis.subscriptions.mrrCents).toBe(1990)
    expect(response.timeseries.revenue).toEqual([
      { bucket: '2026-08-01', valueCents: 1990 },
    ])
    expect(response.timeseries.signups).toEqual([
      { bucket: '2026-08-01', value: 1 },
    ])
    expect(response.timeseries.newSubscriptions).toEqual([
      { bucket: '2026-08-01', value: 1 },
    ])
  })
})
