import { Subscription } from '../../domain/entities/subscription.entity'
import type { SubscriptionStatus } from '../../domain/value-objects/subscription-status.vo'
import type { PaymentProvider } from '../../domain/value-objects/payment-provider.vo'
import type { SubscriptionModel } from '../../../../generated/prisma/models/Subscription'

/**
 * Converte a entidade `Subscription` (domínio) para o formato de persistência
 * Prisma (snake_case) e vice-versa.
 */
export class SubscriptionMapper {
  static toPersistence(subscription: Subscription): {
    id: string
    user_id: string
    plan_id: string
    provider: PaymentProvider
    provider_customer_id: string | null
    provider_subscription_id: string | null
    status: SubscriptionStatus
    started_at: Date
    current_period_start: Date
    current_period_end: Date
    cancelled_at: Date | null
    created_at: Date
    updated_at: Date
  } {
    return {
      id: subscription.id,
      user_id: subscription.userId,
      plan_id: subscription.planId,
      provider: subscription.provider,
      provider_customer_id: subscription.providerCustomerId,
      provider_subscription_id: subscription.providerSubscriptionId,
      status: subscription.status,
      started_at: subscription.startedAt,
      current_period_start: subscription.currentPeriodStart,
      current_period_end: subscription.currentPeriodEnd,
      cancelled_at: subscription.cancelledAt,
      created_at: subscription.createdAt,
      updated_at: subscription.updatedAt,
    }
  }

  static toDomain(model: SubscriptionModel): Subscription {
    return Subscription.reconstitute({
      id: model.id,
      userId: model.user_id,
      planId: model.plan_id,
      provider: model.provider,
      providerCustomerId: model.provider_customer_id,
      providerSubscriptionId: model.provider_subscription_id,
      status: model.status,
      startedAt: model.started_at,
      currentPeriodStart: model.current_period_start,
      currentPeriodEnd: model.current_period_end,
      cancelledAt: model.cancelled_at,
      createdAt: model.created_at,
      updatedAt: model.updated_at,
    })
  }
}
