import { Inject, Injectable } from '@nestjs/common'
import { SUBSCRIPTION_REPOSITORY_PORT } from '../../domain/repositories/subscription.repository.port'
import type { SubscriptionRepositoryPort } from '../../domain/repositories/subscription.repository.port'
import { PLAN_REPOSITORY_PORT } from '../../../plans/domain/repositories/plan.repository.port'
import type { PlanRepositoryPort } from '../../../plans/domain/repositories/plan.repository.port'
import { FEATURE_REPOSITORY_PORT } from '../../../plans/domain/repositories/feature.repository.port'
import type { FeatureRepositoryPort } from '../../../plans/domain/repositories/feature.repository.port'
import type { Plan } from '../../../plans/domain/entities/plan.entity'
import type { Feature } from '../../../plans/domain/entities/feature.entity'

export interface UserPlanFeaturesResult {
  plan: Plan | null
  features: Feature[]
}

/**
 * Caso de uso: retorna o plano atual e as features ativas de um usuário
 * (para a UI). Consumido por `GET /subscriptions/features`.
 */
@Injectable()
export class GetUserPlanFeaturesUseCase {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY_PORT)
    private readonly subscriptions: SubscriptionRepositoryPort,
    @Inject(PLAN_REPOSITORY_PORT)
    private readonly plans: PlanRepositoryPort,
    @Inject(FEATURE_REPOSITORY_PORT)
    private readonly features: FeatureRepositoryPort,
  ) {}

  async execute(userId: string): Promise<UserPlanFeaturesResult> {
    const subscription = await this.subscriptions.findActiveByUserId(userId)
    if (!subscription) {
      return { plan: null, features: [] }
    }

    const plan = await this.plans.findById(subscription.planId)
    const features = await this.features.findByPlanId(subscription.planId)

    return { plan, features }
  }
}
