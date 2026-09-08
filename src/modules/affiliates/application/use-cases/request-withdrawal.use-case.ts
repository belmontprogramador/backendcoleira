import { Inject, Injectable } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { AFFILIATE_REPOSITORY_PORT } from '../../domain/repositories/affiliate.repository.port'
import type { AffiliateRepositoryPort } from '../../domain/repositories/affiliate.repository.port'
import { COMMISSION_REPOSITORY_PORT } from '../../domain/repositories/commission.repository.port'
import type { CommissionRepositoryPort } from '../../domain/repositories/commission.repository.port'
import { WITHDRAWAL_REPOSITORY_PORT } from '../../domain/repositories/withdrawal.repository.port'
import type { WithdrawalRepositoryPort } from '../../domain/repositories/withdrawal.repository.port'
import { Withdrawal } from '../../domain/entities/withdrawal.entity'
import type { RequestWithdrawalDto } from '../dtos/request-withdrawal.schema'
import {
  InsufficientBalanceError,
  NoAffiliateProfileError,
  WithdrawalBelowMinimumError,
} from '../errors'

/**
 * Caso de uso: solicitar um saque (self).
 * Valida piso do afiliado (`minWithdrawalCents`) e saldo disponível
 * (comissões AVAILABLE − saques ativos).
 */
@Injectable()
export class RequestWithdrawalUseCase {
  constructor(
    @Inject(AFFILIATE_REPOSITORY_PORT)
    private readonly affiliates: AffiliateRepositoryPort,
    @Inject(COMMISSION_REPOSITORY_PORT)
    private readonly commissions: CommissionRepositoryPort,
    @Inject(WITHDRAWAL_REPOSITORY_PORT)
    private readonly withdrawals: WithdrawalRepositoryPort,
  ) {}

  async execute(userId: string, dto: RequestWithdrawalDto): Promise<Withdrawal> {
    const affiliate = await this.affiliates.findByUserId(userId)
    if (!affiliate || !affiliate.isActive()) {
      throw new NoAffiliateProfileError()
    }

    if (dto.amountCents < affiliate.minWithdrawalCents) {
      throw new WithdrawalBelowMinimumError()
    }

    const [available, active] = await Promise.all([
      this.commissions.sumAvailableByAffiliateId(affiliate.id),
      this.withdrawals.sumActiveByAffiliateId(affiliate.id),
    ])
    const balance = available - active
    if (dto.amountCents > balance) {
      throw new InsufficientBalanceError()
    }

    const withdrawal = Withdrawal.create({
      id: randomUUID(),
      affiliateId: affiliate.id,
      amountCents: dto.amountCents,
      pixKey: affiliate.pixKey ?? '',
    })

    return this.withdrawals.save(withdrawal)
  }
}
