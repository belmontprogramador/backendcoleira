import type { AdminUserPlanResult } from '../use-cases/admin-get-user-plan.use-case'
import type { SubscriptionStatus } from '../../domain/value-objects/subscription-status.vo'

export interface AdminUserPlanResponse {
  plan: {
    id: string
    code: string
    name: string
    isDefault: boolean
  } | null
  subscription: {
    id: string
    status: SubscriptionStatus
    currentPeriodEnd: Date
  } | null
}

/**
 * Projeta o resultado de `AdminGetUserPlanUseCase` para o formato HTTP (camelCase).
 * O front decide "Premium vs Free" por `plan?.code === 'PREMIUM'`.
 */
export class AdminUserPlanResponseMapper {
  static toResponse(result: AdminUserPlanResult): AdminUserPlanResponse {
    return {
      plan: result.plan
        ? {
            id: result.plan.id,
            code: result.plan.code,
            name: result.plan.name,
            isDefault: result.plan.isDefault,
          }
        : null,
      subscription: result.subscription
        ? {
            id: result.subscription.id,
            status: result.subscription.status,
            currentPeriodEnd: result.subscription.currentPeriodEnd,
          }
        : null,
    }
  }
}
