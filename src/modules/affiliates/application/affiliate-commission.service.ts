import { Inject, Injectable } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { AFFILIATE_REPOSITORY_PORT } from '../domain/repositories/affiliate.repository.port'
import type { AffiliateRepositoryPort } from '../domain/repositories/affiliate.repository.port'
import { COMMISSION_REPOSITORY_PORT } from '../domain/repositories/commission.repository.port'
import type { CommissionRepositoryPort } from '../domain/repositories/commission.repository.port'
import { AUDIT_LOGGER_PORT } from '../../../common/ports/audit-logger.port'
import type { AuditLoggerPort } from '../../../common/ports/audit-logger.port'
import type {
  AffiliateCommissionPort,
  AttributeOrderCommissionInput,
  AttributeSubscriptionCommissionInput,
} from '../../../common/ports/affiliate-commission.port'
import { Commission } from '../domain/entities/commission.entity'

/**
 * Implementação da `AFFILIATE_COMMISSION_PORT`.
 *
 * Resolve o afiliado ativo pelo `referralCode`, calcula a comissão com a config
 * snapshot do afiliado e persiste a `Commission`. Sem `referralCode` ou sem
 * afiliado ativo, não faz nada (venda sem indicação não gera comissão).
 */
@Injectable()
export class AffiliateCommissionService implements AffiliateCommissionPort {
  constructor(
    @Inject(AFFILIATE_REPOSITORY_PORT)
    private readonly affiliates: AffiliateRepositoryPort,
    @Inject(COMMISSION_REPOSITORY_PORT)
    private readonly commissions: CommissionRepositoryPort,
    @Inject(AUDIT_LOGGER_PORT) private readonly audit: AuditLoggerPort,
  ) {}

  async attributeOrder(input: AttributeOrderCommissionInput): Promise<void> {
    const code = normalizeCode(input.referralCode)
    if (!code) {
      return
    }
    const affiliate = await this.affiliates.findByCode(code)
    if (!affiliate || !affiliate.isActive()) {
      return
    }

    const commission = Commission.create({
      id: randomUUID(),
      affiliateId: affiliate.id,
      source: 'ORDER',
      orderId: input.orderId,
      baseAmountCents: input.baseAmountCents,
      commission: affiliate.commission,
    })

    await this.commissions.save(commission)
    await this.audit.log({
      action: 'commission_created',
      entity: 'commission',
      entityId: commission.id,
      metadata: {
        source: 'ORDER',
        orderId: input.orderId,
        affiliateId: affiliate.id,
        amountCents: commission.amountCents,
      },
    })
  }

  async attributeSubscription(
    input: AttributeSubscriptionCommissionInput,
  ): Promise<void> {
    const code = normalizeCode(input.referralCode)
    if (!code) {
      return
    }
    const affiliate = await this.affiliates.findByCode(code)
    if (!affiliate || !affiliate.isActive()) {
      return
    }

    const commission = Commission.create({
      id: randomUUID(),
      affiliateId: affiliate.id,
      source: 'SUBSCRIPTION',
      subscriptionId: input.subscriptionId,
      baseAmountCents: input.baseAmountCents,
      commission: affiliate.commission,
    })

    await this.commissions.save(commission)
    await this.audit.log({
      action: 'commission_created',
      entity: 'commission',
      entityId: commission.id,
      metadata: {
        source: 'SUBSCRIPTION',
        subscriptionId: input.subscriptionId,
        affiliateId: affiliate.id,
        amountCents: commission.amountCents,
      },
    })
  }

  async revokeOrder(orderId: string): Promise<void> {
    const commission = await this.commissions.findByOrderId(orderId)
    if (commission && commission.isAvailable()) {
      commission.cancel()
      await this.commissions.save(commission)
      await this.audit.log({
        action: 'commission_cancelled',
        entity: 'commission',
        entityId: commission.id,
        metadata: { source: 'ORDER', orderId },
      })
    }
  }

  async revokeSubscription(subscriptionId: string): Promise<void> {
    const commission = await this.commissions.findBySubscriptionId(
      subscriptionId,
    )
    if (commission && commission.isAvailable()) {
      commission.cancel()
      await this.commissions.save(commission)
      await this.audit.log({
        action: 'commission_cancelled',
        entity: 'commission',
        entityId: commission.id,
        metadata: { source: 'SUBSCRIPTION', subscriptionId },
      })
    }
  }
}

function normalizeCode(code: string | null | undefined): string | null {
  if (!code) {
    return null
  }
  const normalized = code.trim().toLowerCase()
  return normalized.length > 0 ? normalized : null
}
