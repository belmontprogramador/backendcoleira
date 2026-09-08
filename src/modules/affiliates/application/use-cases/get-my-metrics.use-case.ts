import { Inject, Injectable } from '@nestjs/common'
import { AFFILIATE_REPOSITORY_PORT } from '../../domain/repositories/affiliate.repository.port'
import type { AffiliateRepositoryPort } from '../../domain/repositories/affiliate.repository.port'
import { COMMISSION_REPOSITORY_PORT } from '../../domain/repositories/commission.repository.port'
import type { CommissionRepositoryPort } from '../../domain/repositories/commission.repository.port'
import { WITHDRAWAL_REPOSITORY_PORT } from '../../domain/repositories/withdrawal.repository.port'
import type { WithdrawalRepositoryPort } from '../../domain/repositories/withdrawal.repository.port'
import type { AffiliateMetrics } from '../affiliate-metrics'
import { NoAffiliateProfileError } from '../errors'

/**
 * Caso de uso: métricas/KPIs do próprio afiliado (self).
 */
@Injectable()
export class GetMyMetricsUseCase {
  constructor(
    @Inject(AFFILIATE_REPOSITORY_PORT)
    private readonly affiliates: AffiliateRepositoryPort,
    @Inject(COMMISSION_REPOSITORY_PORT)
    private readonly commissions: CommissionRepositoryPort,
    @Inject(WITHDRAWAL_REPOSITORY_PORT)
    private readonly withdrawals: WithdrawalRepositoryPort,
  ) {}

  async execute(userId: string): Promise<AffiliateMetrics> {
    const affiliate = await this.affiliates.findByUserId(userId)
    if (!affiliate || !affiliate.isActive()) {
      throw new NoAffiliateProfileError()
    }

    const [agg, activeWithdrawals, paidWithdrawals] = await Promise.all([
      this.commissions.aggregateByAffiliateId(affiliate.id),
      this.withdrawals.sumActiveByAffiliateId(affiliate.id),
      this.withdrawals.sumPaidByAffiliateId(affiliate.id),
    ])

    return {
      salesCount: agg.salesCount,
      subscriptionsCount: agg.subscriptionsCount,
      revenueCents: agg.revenueCents,
      commissionTotalCents: agg.commissionTotalCents,
      availableCents: agg.availableCents - activeWithdrawals,
      withdrawnCents: paidWithdrawals,
    }
  }
}
