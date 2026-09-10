import { Affiliate } from '../../domain/entities/affiliate.entity'
import { CommissionConfig } from '../../domain/value-objects/commission-config.vo'
import type { AffiliateStatus } from '../../domain/value-objects/affiliate-status.vo'
import type { CommissionType } from '../../domain/value-objects/commission-config.vo'
import type { AffiliateModel } from '../../../../generated/prisma/models/Affiliate'

/**
 * Converte a entidade `Affiliate` (domínio) para o formato de persistência
 * Prisma (snake_case) e vice-versa.
 */
export class AffiliateMapper {
  static toPersistence(affiliate: Affiliate): {
    id: string
    user_id: string | null
    code: string
    name: string
    email: string
    phone: string | null
    document: string | null
    pix_key: string | null
    bank_name: string | null
    bank_agency: string | null
    bank_account: string | null
    sale_commission_type: CommissionType
    sale_commission_fixed_cents: number
    sale_commission_percent_bps: number
    subscription_commission_type: CommissionType
    subscription_commission_fixed_cents: number
    subscription_commission_percent_bps: number
    min_withdrawal_cents: number
    status: AffiliateStatus
    created_at: Date
    updated_at: Date
  } {
    return {
      id: affiliate.id,
      user_id: affiliate.userId,
      code: affiliate.code,
      name: affiliate.name,
      email: affiliate.email,
      phone: affiliate.phone,
      document: affiliate.document,
      pix_key: affiliate.pixKey,
      bank_name: affiliate.bankName,
      bank_agency: affiliate.bankAgency,
      bank_account: affiliate.bankAccount,
      sale_commission_type: affiliate.saleCommission.type,
      sale_commission_fixed_cents: affiliate.saleCommission.fixedCents,
      sale_commission_percent_bps: affiliate.saleCommission.percentBps,
      subscription_commission_type: affiliate.subscriptionCommission.type,
      subscription_commission_fixed_cents:
        affiliate.subscriptionCommission.fixedCents,
      subscription_commission_percent_bps:
        affiliate.subscriptionCommission.percentBps,
      min_withdrawal_cents: affiliate.minWithdrawalCents,
      status: affiliate.status,
      created_at: affiliate.createdAt,
      updated_at: affiliate.updatedAt,
    }
  }

  static toDomain(model: AffiliateModel): Affiliate {
    return Affiliate.reconstitute({
      id: model.id,
      userId: model.user_id,
      code: model.code,
      name: model.name,
      email: model.email,
      phone: model.phone,
      document: model.document,
      pixKey: model.pix_key,
      bankName: model.bank_name,
      bankAgency: model.bank_agency,
      bankAccount: model.bank_account,
      saleCommission: CommissionConfig.create({
        type: model.sale_commission_type,
        fixedCents: model.sale_commission_fixed_cents,
        percentBps: model.sale_commission_percent_bps,
      }),
      subscriptionCommission: CommissionConfig.create({
        type: model.subscription_commission_type,
        fixedCents: model.subscription_commission_fixed_cents,
        percentBps: model.subscription_commission_percent_bps,
      }),
      minWithdrawalCents: model.min_withdrawal_cents,
      status: model.status,
      createdAt: model.created_at,
      updatedAt: model.updated_at,
    })
  }
}
