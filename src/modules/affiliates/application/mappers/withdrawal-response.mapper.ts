import type { Withdrawal } from '../../domain/entities/withdrawal.entity'

export interface WithdrawalResponse {
  id: string
  affiliateId: string
  amountCents: number
  pixKey: string
  status: string
  requestedAt: Date
  processedAt: Date | null
  paidAt: Date | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Projeta a entidade `Withdrawal` para a resposta HTTP (camelCase).
 */
export class WithdrawalResponseMapper {
  static toResponse(withdrawal: Withdrawal): WithdrawalResponse {
    return {
      id: withdrawal.id,
      affiliateId: withdrawal.affiliateId,
      amountCents: withdrawal.amountCents,
      pixKey: withdrawal.pixKey,
      status: withdrawal.status,
      requestedAt: withdrawal.requestedAt,
      processedAt: withdrawal.processedAt,
      paidAt: withdrawal.paidAt,
      createdAt: withdrawal.createdAt,
      updatedAt: withdrawal.updatedAt,
    }
  }
}
