import { AffiliateController } from '../affiliate.controller'
import type { GetMyAffiliateUseCase } from '../../../application/use-cases/get-my-affiliate.use-case'
import type { UpdateMyAffiliateUseCase } from '../../../application/use-cases/update-my-affiliate.use-case'
import type { GetMyMetricsUseCase } from '../../../application/use-cases/get-my-metrics.use-case'
import type { RequestWithdrawalUseCase } from '../../../application/use-cases/request-withdrawal.use-case'
import type { ListMyWithdrawalsUseCase } from '../../../application/use-cases/list-my-withdrawals.use-case'
import { Affiliate } from '../../../domain/entities/affiliate.entity'
import { Withdrawal } from '../../../domain/entities/withdrawal.entity'

function makeAffiliate() {
  return Affiliate.create({
    id: 'aff-1',
    userId: 'user-1',
    code: 'ana123',
    name: 'Ana',
    email: 'ana@example.com',
    pixKey: 'ana@pix.com',
  })
}

const user = { sub: 'user-1', email: 'ana@example.com' }

function makeSut() {
  const getMyUseCase = {
    execute: jest.fn(),
  } as unknown as jest.Mocked<GetMyAffiliateUseCase>
  const updateMyUseCase = {
    execute: jest.fn(),
  } as unknown as jest.Mocked<UpdateMyAffiliateUseCase>
  const myMetricsUseCase = {
    execute: jest.fn(),
  } as unknown as jest.Mocked<GetMyMetricsUseCase>
  const requestWithdrawalUseCase = {
    execute: jest.fn(),
  } as unknown as jest.Mocked<RequestWithdrawalUseCase>
  const listMyWithdrawalsUseCase = {
    execute: jest.fn(),
  } as unknown as jest.Mocked<ListMyWithdrawalsUseCase>

  const controller = new AffiliateController(
    getMyUseCase,
    updateMyUseCase,
    myMetricsUseCase,
    requestWithdrawalUseCase,
    listMyWithdrawalsUseCase,
  )
  return { controller, getMyUseCase, requestWithdrawalUseCase }
}

describe('AffiliateController', () => {
  it('getMe usa o sub do token', async () => {
    const { controller, getMyUseCase } = makeSut()
    getMyUseCase.execute.mockResolvedValue(makeAffiliate())

    const result = await controller.getMe(user)

    expect(getMyUseCase.execute).toHaveBeenCalledWith('user-1')
    expect(result.code).toBe('ana123')
  })

  it('requestWithdrawal usa o sub do token', async () => {
    const { controller, requestWithdrawalUseCase } = makeSut()
    requestWithdrawalUseCase.execute.mockResolvedValue(
      Withdrawal.create({
        id: 'wd-1',
        affiliateId: 'aff-1',
        amountCents: 5000,
        pixKey: 'ana@pix.com',
      }),
    )

    await controller.requestWithdrawal(user, { amountCents: 5000 })

    expect(requestWithdrawalUseCase.execute).toHaveBeenCalledWith('user-1', {
      amountCents: 5000,
    })
  })
})
