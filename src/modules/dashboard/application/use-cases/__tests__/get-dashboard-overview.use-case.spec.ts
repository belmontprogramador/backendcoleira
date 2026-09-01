import { GetDashboardOverviewUseCase } from '../get-dashboard-overview.use-case'
import type { DashboardMetricsPort } from '../../../domain/repositories/dashboard-metrics.port'
import { DEFAULT_RANGE_DAYS } from '../../../domain/value-objects/date-range.vo'

describe('GetDashboardOverviewUseCase', () => {
  let metrics: jest.Mocked<DashboardMetricsPort>
  let useCase: GetDashboardOverviewUseCase

  beforeEach(() => {
    metrics = {
      countUsers: jest.fn().mockResolvedValue({
        total: 1,
        new: 0,
        active: 1,
        blocked: 0,
        pendingVerification: 0,
        verifiedEmail: 1,
        premium: 1,
      }),
      countPets: jest.fn().mockResolvedValue({
        total: 1,
        new: 0,
        lost: 0,
        withPhoto: 0,
        bySpecies: {},
      }),
      subscriptionStats: jest.fn().mockResolvedValue({
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
      }),
      paymentStats: jest.fn().mockResolvedValue({
        revenueCents: 1990,
        approvedCount: 1,
        pendingCount: 0,
        rejectedCount: 0,
        avgTicketCents: 1990,
        conversionRate: 1,
      }),
      scanStats: jest.fn().mockResolvedValue({
        total: 1,
        uniquePets: 1,
        uniqueVisitors: 1,
        bySource: {},
        topPets: [],
      }),
      contactStats: jest.fn().mockResolvedValue({
        total: 0,
        unread: 0,
        withLocation: 0,
      }),
      nfcStats: jest.fn().mockResolvedValue({
        totalTags: 1,
        activeTags: 0,
        lostTags: 0,
        activatedInPeriod: 0,
        byStatus: {},
      }),
      timeseries: jest
        .fn()
        .mockResolvedValue([{ bucket: '2026-08-01', value: 1 }]),
    }
    useCase = new GetDashboardOverviewUseCase(metrics)
  })

  it('usa o período padrão de 30 dias quando não informado', async () => {
    await useCase.execute({ granularity: 'day' })

    const range = metrics.countUsers.mock.calls[0][0]
    expect(range.days).toBe(DEFAULT_RANGE_DAYS)
  })

  it('agrega todos os KPIs e séries temporais', async () => {
    const result = await useCase.execute({
      granularity: 'month',
      from: new Date('2026-08-01T00:00:00.000Z'),
      to: new Date('2026-08-31T00:00:00.000Z'),
    })

    expect(result.granularity).toBe('month')
    expect(result.kpis.users.total).toBe(1)
    expect(result.kpis.pets.total).toBe(1)
    expect(result.kpis.subscriptions.mrrCents).toBe(1990)
    expect(result.kpis.payments.revenueCents).toBe(1990)
    expect(result.kpis.scans.total).toBe(1)
    expect(result.kpis.contacts.total).toBe(0)
    expect(result.kpis.nfc.totalTags).toBe(1)
  })

  it('chama timeseries para as 4 métricas com a granularidade correta', async () => {
    await useCase.execute({
      granularity: 'week',
      from: new Date('2026-08-01T00:00:00.000Z'),
      to: new Date('2026-08-31T00:00:00.000Z'),
    })

    expect(metrics.timeseries).toHaveBeenCalledTimes(4)
    expect(metrics.timeseries).toHaveBeenCalledWith(
      'signups',
      expect.anything(),
      'week',
    )
    expect(metrics.timeseries).toHaveBeenCalledWith(
      'scans',
      expect.anything(),
      'week',
    )
    expect(metrics.timeseries).toHaveBeenCalledWith(
      'revenue',
      expect.anything(),
      'week',
    )
    expect(metrics.timeseries).toHaveBeenCalledWith(
      'newSubscriptions',
      expect.anything(),
      'week',
    )
  })

  it('usa `to` como âncora do período default quando só `to` é informado', async () => {
    const to = new Date('2026-08-31T00:00:00.000Z')
    await useCase.execute({ granularity: 'day', to })

    const range = metrics.countUsers.mock.calls[0][0]
    expect(range.to).toEqual(to)
    expect(range.from.getTime()).toBe(
      to.getTime() - DEFAULT_RANGE_DAYS * 86_400_000,
    )
  })
})
