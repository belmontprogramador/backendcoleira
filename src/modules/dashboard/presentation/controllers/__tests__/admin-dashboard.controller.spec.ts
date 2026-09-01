import { AdminDashboardController } from '../admin-dashboard.controller'
import { GetDashboardOverviewUseCase } from '../../../application/use-cases/get-dashboard-overview.use-case'
import { DateRange } from '../../../domain/value-objects/date-range.vo'

describe('AdminDashboardController', () => {
  let getOverview: jest.Mocked<GetDashboardOverviewUseCase>
  let controller: AdminDashboardController

  beforeEach(() => {
    getOverview = {
      execute: jest.fn(),
    } as jest.Mocked<GetDashboardOverviewUseCase>
    controller = new AdminDashboardController(getOverview)
  })

  it('retorna o overview mapeado com period e kpis', async () => {
    getOverview.execute.mockResolvedValue({
      range: DateRange.create(
        new Date('2026-08-01T00:00:00.000Z'),
        new Date('2026-08-31T00:00:00.000Z'),
      ),
      granularity: 'day',
      kpis: {
        users: {
          total: 1,
          new: 0,
          active: 1,
          blocked: 0,
          pendingVerification: 0,
          verifiedEmail: 0,
          premium: 0,
        },
        pets: { total: 0, new: 0, lost: 0, withPhoto: 0, bySpecies: {} },
        subscriptions: {
          active: 0,
          trialing: 0,
          pastDue: 0,
          cancelled: 0,
          expired: 0,
          new: 0,
          churn: 0,
          mrrCents: 0,
          premiumCount: 0,
          basicCount: 0,
          upcomingRenewals7d: 0,
          upcomingRenewals30d: 0,
        },
        payments: {
          revenueCents: 0,
          approvedCount: 0,
          pendingCount: 0,
          rejectedCount: 0,
          avgTicketCents: 0,
          conversionRate: 0,
        },
        scans: {
          total: 0,
          uniquePets: 0,
          uniqueVisitors: 0,
          bySource: {},
          topPets: [],
        },
        contacts: { total: 0, unread: 0, withLocation: 0 },
        nfc: {
          totalTags: 0,
          activeTags: 0,
          lostTags: 0,
          activatedInPeriod: 0,
          byStatus: {},
        },
      },
      timeseries: {
        signups: [],
        scans: [],
        revenue: [],
        newSubscriptions: [],
      },
    })

    const result = await controller.overview({ granularity: 'day' })

    expect(getOverview.execute).toHaveBeenCalledWith({ granularity: 'day' })
    expect(result.period.days).toBe(30)
    expect(result.kpis.users.total).toBe(1)
    expect(result.timeseries.revenue).toEqual([])
  })
})
