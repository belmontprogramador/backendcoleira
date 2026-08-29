import { Inject, Injectable } from '@nestjs/common'
import type { FeatureAccessPort } from '../../../common/ports/feature-access.port'
import { SUBSCRIPTION_REPOSITORY_PORT } from '../domain/repositories/subscription.repository.port'
import type { SubscriptionRepositoryPort } from '../domain/repositories/subscription.repository.port'
import { FEATURE_REPOSITORY_PORT } from '../../plans/domain/repositories/feature.repository.port'
import type { FeatureRepositoryPort } from '../../plans/domain/repositories/feature.repository.port'

/**
 * Implementação concreta do `FeatureAccessPort`.
 *
 * Resolve a assinatura ativa do usuário → plano → features do plano. Usuário
 * sem assinatura ativa (Basic) não tem nenhuma feature Premium.
 */
@Injectable()
export class PrismaFeatureAccessService implements FeatureAccessPort {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY_PORT)
    private readonly subscriptions: SubscriptionRepositoryPort,
    @Inject(FEATURE_REPOSITORY_PORT)
    private readonly features: FeatureRepositoryPort,
  ) {}

  async hasFeature(userId: string, code: string): Promise<boolean> {
    const features = await this.listFeatures(userId)
    return features.includes(code)
  }

  async listFeatures(userId: string): Promise<string[]> {
    const subscription = await this.subscriptions.findActiveByUserId(userId)
    if (!subscription) {
      return []
    }
    const features = await this.features.findByPlanId(subscription.planId)
    return features.map(f => f.code)
  }
}
