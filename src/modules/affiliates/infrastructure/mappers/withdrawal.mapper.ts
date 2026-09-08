import { Withdrawal } from '../../domain/entities/withdrawal.entity'
import type { WithdrawalStatus } from '../../domain/value-objects/withdrawal-status.vo'
import type { WithdrawalModel } from '../../../../generated/prisma/models/Withdrawal'

/**
 * Converte a entidade `Withdrawal` (domínio) para o formato de persistência
 * Prisma (snake_case) e vice-versa.
 */
export class WithdrawalMapper {
  static toPersistence(withdrawal: Withdrawal): {
    id: string
    affiliate_id: string
    amount_cents: number
    pix_key: string
    status: WithdrawalStatus
    requested_at: Date
    processed_at: Date | null
    paid_at: Date | null
    created_at: Date
    updated_at: Date
  } {
    return {
      id: withdrawal.id,
      affiliate_id: withdrawal.affiliateId,
      amount_cents: withdrawal.amountCents,
      pix_key: withdrawal.pixKey,
      status: withdrawal.status,
      requested_at: withdrawal.requestedAt,
      processed_at: withdrawal.processedAt,
      paid_at: withdrawal.paidAt,
      created_at: withdrawal.createdAt,
      updated_at: withdrawal.updatedAt,
    }
  }

  static toDomain(model: WithdrawalModel): Withdrawal {
    return Withdrawal.reconstitute({
      id: model.id,
      affiliateId: model.affiliate_id,
      amountCents: model.amount_cents,
      pixKey: model.pix_key,
      status: model.status,
      requestedAt: model.requested_at,
      processedAt: model.processed_at,
      paidAt: model.paid_at,
      createdAt: model.created_at,
      updatedAt: model.updated_at,
    })
  }
}
