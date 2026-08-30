import { Inject, Injectable } from '@nestjs/common'
import { SUBSCRIPTION_REPOSITORY_PORT } from '../../domain/repositories/subscription.repository.port'
import type { SubscriptionRepositoryPort } from '../../domain/repositories/subscription.repository.port'
import { USER_ACCESS_PORT } from '../../../../common/ports/user-access.port'
import type { UserAccessPort } from '../../../../common/ports/user-access.port'
import { AUDIT_LOGGER_PORT } from '../../../../common/ports/audit-logger.port'
import type { AuditLoggerPort } from '../../../../common/ports/audit-logger.port'
import { canManage } from '../../../../common/constants/roles'
import { HierarchyViolationError } from '../../../../modules/users/application/errors'
import { SubscriptionNotFoundError } from '../errors'
import type { Subscription } from '../../domain/entities/subscription.entity'

/**
 * Caso de uso (admin): cancelar a assinatura de um usuário em nome dele.
 *
 * Aplica hierarquia (`canManage`): o ator só cancela a assinatura de um alvo
 * de role estritamente inferior. O cancelamento em si é idempotente
 * (`Subscription.cancel()` preserva o `cancelledAt` original).
 */
@Injectable()
export class AdminCancelSubscriptionUseCase {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY_PORT)
    private readonly subscriptions: SubscriptionRepositoryPort,
    @Inject(USER_ACCESS_PORT) private readonly access: UserAccessPort,
    @Inject(AUDIT_LOGGER_PORT) private readonly audit: AuditLoggerPort,
  ) {}

  async execute(actorRoles: string[], userId: string): Promise<Subscription> {
    const targetAccess = await this.access.resolveAccess(userId)
    const targetRoles = targetAccess?.roles ?? []

    if (!canManage(actorRoles, targetRoles)) {
      throw new HierarchyViolationError()
    }

    const subscription = await this.subscriptions.findByUserId(userId)
    if (!subscription) {
      throw new SubscriptionNotFoundError()
    }

    subscription.cancel()
    await this.subscriptions.save(subscription)

    await this.audit.log({
      action: 'subscription.cancelled_by_admin',
      entity: 'Subscription',
      entityId: subscription.id,
      metadata: { planId: subscription.planId, targetUserId: userId },
    })

    return subscription
  }
}
