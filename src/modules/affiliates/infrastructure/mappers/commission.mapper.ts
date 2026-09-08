import { Commission } from '../../domain/entities/commission.entity'
import type { CommissionStatus } from '../../domain/value-objects/commission-status.vo'
import type { CommissionSource } from '../../domain/value-objects/commission-source.vo'
import type { CommissionType } from '../../domain/value-objects/commission-config.vo'
import type { CommissionModel } from '../../../../generated/prisma/models/Commission'

/**
 * Converte a entidade `Commission` (domínio) para o formato de persistência
 * Prisma (snake_case) e vice-versa.
 */
export class CommissionMapper {
  static toPersistence(commission: Commission): {
    id: string
    affiliate_id: string
    source: CommissionSource
    order_id: string | null
    subscription_id: string | null
    base_amount_cents: number
    commission_type: CommissionType
    fixed_cents: number
    percent_bps: number
    amount_cents: number
    status: CommissionStatus
    created_at: Date
    updated_at: Date
  } {
    return {
      id: commission.id,
      affiliate_id: commission.affiliateId,
      source: commission.source,
      order_id: commission.orderId,
      subscription_id: commission.subscriptionId,
      base_amount_cents: commission.baseAmountCents,
      commission_type: commission.commissionType,
      fixed_cents: commission.fixedCents,
      percent_bps: commission.percentBps,
      amount_cents: commission.amountCents,
      status: commission.status,
      created_at: commission.createdAt,
      updated_at: commission.updatedAt,
    }
  }

  static toDomain(model: CommissionModel): Commission {
    return Commission.reconstitute({
      id: model.id,
      affiliateId: model.affiliate_id,
      source: model.source,
      orderId: model.order_id,
      subscriptionId: model.subscription_id,
      baseAmountCents: model.base_amount_cents,
      commissionType: model.commission_type,
      fixedCents: model.fixed_cents,
      percentBps: model.percent_bps,
      amountCents: model.amount_cents,
      status: model.status,
      createdAt: model.created_at,
      updatedAt: model.updated_at,
    })
  }
}
