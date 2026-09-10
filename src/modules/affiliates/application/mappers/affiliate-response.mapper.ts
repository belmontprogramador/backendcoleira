import type { Affiliate } from '../../domain/entities/affiliate.entity'

export interface AffiliateCommissionResponse {
  type: string
  fixedCents: number
  percentBps: number
}

export interface AffiliateResponse {
  id: string
  userId: string | null
  code: string
  name: string
  email: string
  phone: string | null
  document: string | null
  pixKey: string | null
  bankName: string | null
  bankAgency: string | null
  bankAccount: string | null
  saleCommission: AffiliateCommissionResponse
  subscriptionCommission: AffiliateCommissionResponse
  minWithdrawalCents: number
  status: string
  createdAt: Date
  updatedAt: Date
}

/**
 * Projeta a entidade `Affiliate` para a resposta HTTP (camelCase).
 */
export class AffiliateResponseMapper {
  static toResponse(affiliate: Affiliate): AffiliateResponse {
    return {
      id: affiliate.id,
      userId: affiliate.userId,
      code: affiliate.code,
      name: affiliate.name,
      email: affiliate.email,
      phone: affiliate.phone,
      document: affiliate.document,
      pixKey: affiliate.pixKey,
      bankName: affiliate.bankName,
      bankAgency: affiliate.bankAgency,
      bankAccount: affiliate.bankAccount,
      saleCommission: {
        type: affiliate.saleCommission.type,
        fixedCents: affiliate.saleCommission.fixedCents,
        percentBps: affiliate.saleCommission.percentBps,
      },
      subscriptionCommission: {
        type: affiliate.subscriptionCommission.type,
        fixedCents: affiliate.subscriptionCommission.fixedCents,
        percentBps: affiliate.subscriptionCommission.percentBps,
      },
      minWithdrawalCents: affiliate.minWithdrawalCents,
      status: affiliate.status,
      createdAt: affiliate.createdAt,
      updatedAt: affiliate.updatedAt,
    }
  }
}
