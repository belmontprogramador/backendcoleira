import type { Commission } from '../entities/commission.entity'

export interface CommissionAggregate {
  salesCount: number
  subscriptionsCount: number
  revenueCents: number
  commissionTotalCents: number
  availableCents: number
}

/**
 * Porta do repositório de comissões.
 */
export interface CommissionRepositoryPort {
  save(commission: Commission): Promise<Commission>
  findByOrderId(orderId: string): Promise<Commission | null>
  findBySubscriptionId(subscriptionId: string): Promise<Commission | null>
  sumAvailableByAffiliateId(affiliateId: string): Promise<number>
  aggregateByAffiliateId(affiliateId: string): Promise<CommissionAggregate>
}

export const COMMISSION_REPOSITORY_PORT = Symbol('COMMISSION_REPOSITORY_PORT')
