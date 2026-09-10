import { AdminAffiliatesController } from '../admin-affiliates.controller'
import type { CreateAffiliateUseCase } from '../../../application/use-cases/create-affiliate.use-case'
import type { UpdateAffiliateUseCase } from '../../../application/use-cases/update-affiliate.use-case'
import type { SetAffiliateStatusUseCase } from '../../../application/use-cases/set-affiliate-status.use-case'
import type { ListAffiliatesUseCase } from '../../../application/use-cases/list-affiliates.use-case'
import type { GetAffiliateUseCase } from '../../../application/use-cases/get-affiliate.use-case'
import type { GetAffiliateMetricsUseCase } from '../../../application/use-cases/get-affiliate-metrics.use-case'
import { Affiliate } from '../../../domain/entities/affiliate.entity'

function makeAffiliate() {
  return Affiliate.create({
    id: 'aff-1',
    code: 'ana123',
    name: 'Ana',
    email: 'ana@example.com',
    pixKey: 'ana@pix.com',
  })
}

function makeSut() {
  const createUseCase = {
    execute: jest.fn(),
  } as unknown as jest.Mocked<CreateAffiliateUseCase>
  const updateUseCase = {
    execute: jest.fn(),
  } as unknown as jest.Mocked<UpdateAffiliateUseCase>
  const setStatusUseCase = {
    execute: jest.fn(),
  } as unknown as jest.Mocked<SetAffiliateStatusUseCase>
  const listUseCase = {
    execute: jest.fn(),
  } as unknown as jest.Mocked<ListAffiliatesUseCase>
  const getUseCase = {
    execute: jest.fn(),
  } as unknown as jest.Mocked<GetAffiliateUseCase>
  const metricsUseCase = {
    execute: jest.fn(),
  } as unknown as jest.Mocked<GetAffiliateMetricsUseCase>

  const controller = new AdminAffiliatesController(
    createUseCase,
    updateUseCase,
    setStatusUseCase,
    listUseCase,
    getUseCase,
    metricsUseCase,
  )

  return {
    controller,
    createUseCase,
    listUseCase,
    getUseCase,
    metricsUseCase,
    setStatusUseCase,
  }
}

describe('AdminAffiliatesController', () => {
  it('create projeta a resposta do afiliado', async () => {
    const { controller, createUseCase } = makeSut()
    createUseCase.execute.mockResolvedValue(makeAffiliate())

    const body = {
      code: 'ana123',
      name: 'Ana',
      email: 'ana@example.com',
      saleCommissionType: 'PERCENTAGE',
      saleCommissionFixedCents: 0,
      saleCommissionPercentBps: 1000,
      subscriptionCommissionType: 'FIXED',
      subscriptionCommissionFixedCents: 500,
      subscriptionCommissionPercentBps: 0,
      minWithdrawalCents: 0,
    }

    const result = await controller.create(body)

    expect(result.code).toBe('ana123')
    expect(result.saleCommission.percentBps).toBe(0)
    expect(result.subscriptionCommission.fixedCents).toBe(0)
    expect(createUseCase.execute).toHaveBeenCalledWith(body)
  })

  it('list monta envelope paginado', async () => {
    const { controller, listUseCase } = makeSut()
    listUseCase.execute.mockResolvedValue({
      data: [makeAffiliate()],
      total: 1,
      page: 1,
      limit: 20,
    })

    const result = await controller.list({
      page: 1,
      limit: 20,
      status: undefined,
      search: undefined,
    })

    expect(result.meta.total).toBe(1)
    expect(result.data).toHaveLength(1)
  })

  it('metrics delega ao use case', async () => {
    const { controller, metricsUseCase } = makeSut()
    metricsUseCase.execute.mockResolvedValue({
      sales: { count: 1, revenueCents: 1990, commissionCents: 199 },
      subscriptions: { count: 0, revenueCents: 0, commissionCents: 0 },
      availableCents: 199,
      withdrawnCents: 0,
    })

    const result = await controller.metrics('aff-1')

    expect(result.sales.count).toBe(1)
    expect(metricsUseCase.execute).toHaveBeenCalledWith('aff-1')
  })

  it('setStatus delega com status do body', async () => {
    const { controller, setStatusUseCase } = makeSut()
    setStatusUseCase.execute.mockResolvedValue(makeAffiliate())

    await controller.setStatus('aff-1', { status: 'INACTIVE' })

    expect(setStatusUseCase.execute).toHaveBeenCalledWith('aff-1', 'INACTIVE')
  })
})
