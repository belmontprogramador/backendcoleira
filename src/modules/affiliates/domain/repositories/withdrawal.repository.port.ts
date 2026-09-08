import type { Withdrawal } from '../entities/withdrawal.entity'
import type { WithdrawalStatus } from '../value-objects/withdrawal-status.vo'

export interface ListWithdrawalsFilter {
  status?: WithdrawalStatus
  affiliateId?: string
  page: number
  limit: number
}

/**
 * Porta do repositório de saques.
 */
export interface WithdrawalRepositoryPort {
  save(withdrawal: Withdrawal): Promise<Withdrawal>
  findById(id: string): Promise<Withdrawal | null>
  listByAffiliateId(affiliateId: string): Promise<Withdrawal[]>
  list(filter: ListWithdrawalsFilter): Promise<Withdrawal[]>
  count(filter: ListWithdrawalsFilter): Promise<number>
  /** Soma dos saques RECEIVED | PROCESSING | PAID (descontam do saldo). */
  sumActiveByAffiliateId(affiliateId: string): Promise<number>
  /** Soma dos saques PAID (total efetivamente pago). */
  sumPaidByAffiliateId(affiliateId: string): Promise<number>
}

export const WITHDRAWAL_REPOSITORY_PORT = Symbol('WITHDRAWAL_REPOSITORY_PORT')
