import { AdminWithdrawalsController } from '../admin-withdrawals.controller'
import type { ListWithdrawalsUseCase } from '../../../application/use-cases/list-withdrawals.use-case'
import type { UpdateWithdrawalStatusUseCase } from '../../../application/use-cases/update-withdrawal-status.use-case'
import { Withdrawal } from '../../../domain/entities/withdrawal.entity'

function makeWithdrawal() {
  return Withdrawal.create({
    id: 'wd-1',
    affiliateId: 'aff-1',
    amountCents: 5000,
    pixKey: 'ana@pix.com',
  })
}

function makeSut() {
  const listUseCase = {
    execute: jest.fn(),
  } as unknown as jest.Mocked<ListWithdrawalsUseCase>
  const updateStatusUseCase = {
    execute: jest.fn(),
  } as unknown as jest.Mocked<UpdateWithdrawalStatusUseCase>
  const controller = new AdminWithdrawalsController(
    listUseCase,
    updateStatusUseCase,
  )
  return { controller, listUseCase, updateStatusUseCase }
}

describe('AdminWithdrawalsController', () => {
  it('list monta envelope paginado', async () => {
    const { controller, listUseCase } = makeSut()
    listUseCase.execute.mockResolvedValue({
      data: [makeWithdrawal()],
      total: 1,
      page: 1,
      limit: 20,
    })

    const result = await controller.list({
      page: 1,
      limit: 20,
      status: undefined,
      affiliateId: undefined,
    })

    expect(result.meta.total).toBe(1)
    expect(result.data).toHaveLength(1)
  })

  it('updateStatus delega ao use case', async () => {
    const { controller, updateStatusUseCase } = makeSut()
    updateStatusUseCase.execute.mockResolvedValue(makeWithdrawal())

    await controller.updateStatus('wd-1', { status: 'PROCESSING' })

    expect(updateStatusUseCase.execute).toHaveBeenCalledWith(
      'wd-1',
      'PROCESSING',
    )
  })
})
