import { Inject, Injectable } from '@nestjs/common'
import type { Subscription } from '../../domain/entities/subscription.entity'
import { SUBSCRIPTION_OWNER_INFO_PORT } from '../../domain/repositories/subscription-owner-info.port'
import type {
  SubscriptionOwnerInfo,
  SubscriptionOwnerInfoPort,
} from '../../domain/repositories/subscription-owner-info.port'
import { PLAN_REPOSITORY_PORT } from '../../../plans/domain/repositories/plan.repository.port'
import type { PlanRepositoryPort } from '../../../plans/domain/repositories/plan.repository.port'
import type { Plan } from '../../../plans/domain/entities/plan.entity'
import { AdminSubscriptionResponseMapper } from '../mappers/admin-subscription-response.mapper'
import type { AdminSubscriptionResponse } from '../mappers/admin-subscription-response.mapper'

/**
 * Monta a resposta administrativa de assinaturas resolvendo donos e planos em
 * lote (duas queries, sem N+1). Mantém o agregado `Subscription` limpo: os
 * dados de exibição do dono (`SubscriptionOwnerInfoPort`) e do plano
 * (`PlanRepositoryPort.findByIds`) vêm de portas.
 */
@Injectable()
export class AdminSubscriptionResponseAssembler {
  constructor(
    @Inject(SUBSCRIPTION_OWNER_INFO_PORT)
    private readonly owners: SubscriptionOwnerInfoPort,
    @Inject(PLAN_REPOSITORY_PORT) private readonly plans: PlanRepositoryPort,
  ) {}

  async toResponses(
    subscriptions: Subscription[],
  ): Promise<AdminSubscriptionResponse[]> {
    const [ownerMap, planMap] = await Promise.all([
      this.resolveOwners(subscriptions),
      this.resolvePlans(subscriptions),
    ])

    return subscriptions.map(subscription =>
      AdminSubscriptionResponseMapper.toResponse(
        subscription,
        ownerMap.get(subscription.userId) ?? null,
        planMap.get(subscription.planId) ?? null,
      ),
    )
  }

  private async resolveOwners(
    subscriptions: Subscription[],
  ): Promise<Map<string, SubscriptionOwnerInfo>> {
    const ids = [...new Set(subscriptions.map(sub => sub.userId))]
    const owners = await this.owners.findByIds(ids)
    return new Map(owners.map(owner => [owner.id, owner]))
  }

  private async resolvePlans(
    subscriptions: Subscription[],
  ): Promise<Map<string, Plan>> {
    const ids = [...new Set(subscriptions.map(sub => sub.planId))]
    const plans = await this.plans.findByIds(ids)
    return new Map(plans.map(plan => [plan.id, plan]))
  }
}
