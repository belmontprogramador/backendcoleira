import { Inject, Injectable } from '@nestjs/common'
import { SUBSCRIPTION_REPOSITORY_PORT } from '../../domain/repositories/subscription.repository.port'
import type { SubscriptionRepositoryPort } from '../../domain/repositories/subscription.repository.port'
import { PLAN_REPOSITORY_PORT } from '../../../plans/domain/repositories/plan.repository.port'
import type { PlanRepositoryPort } from '../../../plans/domain/repositories/plan.repository.port'
import type { Plan } from '../../../plans/domain/entities/plan.entity'
import type { Subscription } from '../../domain/entities/subscription.entity'

export interface AdminUserPlanResult {
  plan: Plan | null
  subscription: Subscription | null
}

/**
 * Caso de uso (admin): retorna o plano ativo e a assinatura de um usuário.
 * `plan: null`/`subscription: null` = usuário sem benefício Premium (free).
 * Usa a assinatura ativa (`ACTIVE`/`TRIALING`) — assinatura expirada cai no free.
 */
@Injectable()
export class AdminGetUserPlanUseCase {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY_PORT)
    private readonly subscriptions: SubscriptionRepositoryPort,
    @Inject(PLAN_REPOSITORY_PORT) private readonly plans: PlanRepositoryPort,
  ) {}

  async execute(userId: string): Promise<AdminUserPlanResult> {
    const subscription = await this.subscriptions.findActiveByUserId(userId)
    if (!subscription) {
      return { plan: null, subscription: null }
    }

    const plan = await this.plans.findById(subscription.planId)
    return { plan, subscription }
  }
}
