import { Inject, Injectable } from '@nestjs/common'
import { AFFILIATE_REPOSITORY_PORT } from '../../domain/repositories/affiliate.repository.port'
import type { AffiliateRepositoryPort } from '../../domain/repositories/affiliate.repository.port'
import { WITHDRAWAL_REPOSITORY_PORT } from '../../domain/repositories/withdrawal.repository.port'
import type { WithdrawalRepositoryPort } from '../../domain/repositories/withdrawal.repository.port'
import type { Withdrawal } from '../../domain/entities/withdrawal.entity'
import { NoAffiliateProfileError } from '../errors'

/**
 * Caso de uso: listar os próprios saques do afiliado (self).
 */
@Injectable()
export class ListMyWithdrawalsUseCase {
  constructor(
    @Inject(AFFILIATE_REPOSITORY_PORT)
    private readonly affiliates: AffiliateRepositoryPort,
    @Inject(WITHDRAWAL_REPOSITORY_PORT)
    private readonly withdrawals: WithdrawalRepositoryPort,
  ) {}

  async execute(userId: string): Promise<Withdrawal[]> {
    const affiliate = await this.affiliates.findByUserId(userId)
    if (!affiliate || !affiliate.isActive()) {
      throw new NoAffiliateProfileError()
    }
    return this.withdrawals.listByAffiliateId(affiliate.id)
  }
}
