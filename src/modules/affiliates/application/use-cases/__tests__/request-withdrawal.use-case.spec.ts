import { RequestWithdrawalUseCase } from '../request-withdrawal.use-case'
import type { AffiliateRepositoryPort } from '../../../domain/repositories/affiliate.repository.port'
import type { CommissionRepositoryPort } from '../../../domain/repositories/commission.repository.port'
import type { WithdrawalRepositoryPort } from '../../../domain/repositories/withdrawal.repository.port'
import { Affiliate } from '../../../domain/entities/affiliate.entity'
import {
  InsufficientBalanceError,
  NoAffiliateProfileError,
  WithdrawalBelowMinimumError,
} from '../../errors'

describe('RequestWithdrawalUseCase', () => {
  let affiliates: jest.Mocked<AffiliateRepositoryPort>
  let commissions: jest.Mocked<CommissionRepositoryPort>
  let withdrawals: jest.Mocked<WithdrawalRepositoryPort>
  let useCase: RequestWithdrawalUseCase

  beforeEach(() => {
    affiliates = {
      save: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      findByCode: jest.fn(),
      findByEmail: jest.fn(),
      list: jest.fn(),
      count: jest.fn(),
    }
    commissions = {
      save: jest.fn(),
      findByOrderId: jest.fn(),
      findBySubscriptionId: jest.fn(),
      sumAvailableByAffiliateId: jest.fn(),
      aggregateByAffiliateId: jest.fn(),
    }
    withdrawals = {
      save: jest.fn(),
      findById: jest.fn(),
      listByAffiliateId: jest.fn(),
      list: jest.fn(),
      count: jest.fn(),
      sumActiveByAffiliateId: jest.fn(),
      sumPaidByAffiliateId: jest.fn(),
    }
    useCase = new RequestWithdrawalUseCase(
      affiliates,
      commissions,
      withdrawals,
    )
  })

  const affiliate = Affiliate.create({
    id: 'aff-1',
    userId: 'user-1',
    code: 'ana123',
    name: 'Ana',
    email: 'ana@example.com',
    pixKey: 'ana@pix.com',
    minWithdrawalCents: 2000,
  })

  it('rejeita quando não há perfil ativo', async () => {
    affiliates.findByUserId.mockResolvedValue(null)
    await expect(
      useCase.execute('user-1', { amountCents: 5000 }),
    ).rejects.toThrow(NoAffiliateProfileError)
  })

  it('rejeita valor abaixo do piso', async () => {
    affiliates.findByUserId.mockResolvedValue(affiliate)
    await expect(
      useCase.execute('user-1', { amountCents: 1000 }),
    ).rejects.toThrow(WithdrawalBelowMinimumError)
  })

  it('rejeita valor acima do saldo disponível', async () => {
    affiliates.findByUserId.mockResolvedValue(affiliate)
    commissions.sumAvailableByAffiliateId.mockResolvedValue(3000)
    withdrawals.sumActiveByAffiliateId.mockResolvedValue(0)
    await expect(
      useCase.execute('user-1', { amountCents: 5000 }),
    ).rejects.toThrow(InsufficientBalanceError)
  })

  it('cria saque quando dentro do piso e do saldo', async () => {
    affiliates.findByUserId.mockResolvedValue(affiliate)
    commissions.sumAvailableByAffiliateId.mockResolvedValue(10000)
    withdrawals.sumActiveByAffiliateId.mockResolvedValue(1000)
    withdrawals.save.mockImplementation(async w => w)

    const result = await useCase.execute('user-1', { amountCents: 5000 })

    expect(result.amountCents).toBe(5000)
    expect(result.status).toBe('RECEIVED')
    expect(result.affiliateId).toBe('aff-1')
    expect(result.pixKey).toBe('ana@pix.com')
  })
})
