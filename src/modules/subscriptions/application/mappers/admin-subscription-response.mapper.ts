import type { Subscription } from '../../domain/entities/subscription.entity'
import type { SubscriptionOwnerInfo } from '../../domain/repositories/subscription-owner-info.port'
import type { Plan } from '../../../plans/domain/entities/plan.entity'
import type { SubscriptionStatus } from '../../domain/value-objects/subscription-status.vo'

export interface AdminSubscriptionOwnerResponse {
  id: string
  name: string
  email: string
}

export interface AdminSubscriptionPlanResponse {
  id: string
  code: string
  name: string
  isDefault: boolean
}

/**
 * Resposta administrativa de assinatura: assinatura + dono (`owner`) + plano
 * (`plan`). Usada pela rota `GET /admin/subscriptions` (ADMIN+).
 */
export interface AdminSubscriptionResponse {
  id: string
  status: SubscriptionStatus
  startedAt: Date
  currentPeriodStart: Date
  currentPeriodEnd: Date
  cancelledAt: Date | null
  owner: AdminSubscriptionOwnerResponse | null
  plan: AdminSubscriptionPlanResponse | null
}

/**
 * Converte a entidade `Subscription` + info do dono + plano em DTO de resposta
 * admin. Nunca expõe `provider_customer_id`/`provider_subscription_id`.
 */
export class AdminSubscriptionResponseMapper {
  static toResponse(
    subscription: Subscription,
    owner: SubscriptionOwnerInfo | null,
    plan: Plan | null,
  ): AdminSubscriptionResponse {
    return {
      id: subscription.id,
      status: subscription.status,
      startedAt: subscription.startedAt,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelledAt: subscription.cancelledAt,
      owner: owner
        ? { id: owner.id, name: owner.name, email: owner.email }
        : null,
      plan: plan
        ? {
            id: plan.id,
            code: plan.code,
            name: plan.name,
            isDefault: plan.isDefault,
          }
        : null,
    }
  }
}
