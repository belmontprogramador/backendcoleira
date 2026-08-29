import { Inject, Injectable } from '@nestjs/common'
import { SUBSCRIPTION_REPOSITORY_PORT } from '../../domain/repositories/subscription.repository.port'
import type { SubscriptionRepositoryPort } from '../../domain/repositories/subscription.repository.port'
import { AUDIT_LOGGER_PORT } from '../../../../common/ports/audit-logger.port'
import type { AuditLoggerPort } from '../../../../common/ports/audit-logger.port'
import { SubscriptionNotFoundError } from '../errors'
import type { Subscription } from '../../domain/entities/subscription.entity'

/**
 * Caso de uso: cancelar a assinatura atual (RF21).
 * `Subscription.cancel()` é idempotente (preserva o `cancelledAt` original).
 * O downgrade não apaga dados Premium — eles apenas ficam ocultos pelo gate.
 */
@Injectable()
export class CancelSubscriptionUseCase {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY_PORT)
    private readonly subscriptions: SubscriptionRepositoryPort,
    @Inject(AUDIT_LOGGER_PORT)
    private readonly audit: AuditLoggerPort,
  ) {}

  async execute(userId: string): Promise<Subscription> {
    const subscription = await this.subscriptions.findByUserId(userId)
    if (!subscription) {
      throw new SubscriptionNotFoundError()
    }

    subscription.cancel()
    await this.subscriptions.save(subscription)
    await this.audit.log({
      userId,
      action: 'subscription.cancelled',
      entity: 'Subscription',
      entityId: subscription.id,
      metadata: { planId: subscription.planId },
    })

    return subscription
  }
}
