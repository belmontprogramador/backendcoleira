import type { Subscription } from '../../domain/entities/subscription.entity'
import type { PaymentProvider } from '../../domain/value-objects/payment-provider.vo'
import type { SubscriptionStatus } from '../../domain/value-objects/subscription-status.vo'

export interface SubscriptionResponse {
  id: string
  userId: string
  planId: string
  provider: PaymentProvider
  status: SubscriptionStatus
  startedAt: Date
  currentPeriodStart: Date
  currentPeriodEnd: Date
  cancelledAt: Date | null
}

/**
 * Mapeia a entidade `Subscription` para o formato de resposta HTTP (camelCase).
 * Nunca expõe `provider_customer_id`/`provider_subscription_id` (dados internos).
 */
export class SubscriptionResponseMapper {
  static toResponse(subscription: Subscription): SubscriptionResponse {
    return {
      id: subscription.id,
      userId: subscription.userId,
      planId: subscription.planId,
      provider: subscription.provider,
      status: subscription.status,
      startedAt: subscription.startedAt,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelledAt: subscription.cancelledAt,
    }
  }
}
