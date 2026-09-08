import { Inject, Injectable } from '@nestjs/common'
import { WITHDRAWAL_REPOSITORY_PORT } from '../../domain/repositories/withdrawal.repository.port'
import type { WithdrawalRepositoryPort } from '../../domain/repositories/withdrawal.repository.port'
import { AUDIT_LOGGER_PORT } from '../../../../common/ports/audit-logger.port'
import type { AuditLoggerPort } from '../../../../common/ports/audit-logger.port'
import type { Withdrawal } from '../../domain/entities/withdrawal.entity'
import { WithdrawalNotFoundError } from '../errors'

type Transition = 'PROCESSING' | 'PAID' | 'REJECTED'

/**
 * Caso de uso: avançar o status de um saque (admin).
 * `RECEIVED → PROCESSING → PAID` (+ `REJECTED` em RECEIVED/PROCESSING).
 */
@Injectable()
export class UpdateWithdrawalStatusUseCase {
  constructor(
    @Inject(WITHDRAWAL_REPOSITORY_PORT)
    private readonly withdrawals: WithdrawalRepositoryPort,
    @Inject(AUDIT_LOGGER_PORT) private readonly audit: AuditLoggerPort,
  ) {}

  async execute(id: string, status: Transition): Promise<Withdrawal> {
    const withdrawal = await this.withdrawals.findById(id)
    if (!withdrawal) {
      throw new WithdrawalNotFoundError()
    }

    if (status === 'PROCESSING') {
      withdrawal.markProcessing()
    } else if (status === 'PAID') {
      withdrawal.markPaid()
    } else {
      withdrawal.markRejected()
    }

    const saved = await this.withdrawals.save(withdrawal)
    await this.audit.log({
      action: 'withdrawal_status_change',
      entity: 'withdrawal',
      entityId: saved.id,
      metadata: { status, affiliateId: saved.affiliateId },
    })
    return saved
  }
}
