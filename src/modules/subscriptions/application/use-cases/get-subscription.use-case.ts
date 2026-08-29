import { Inject, Injectable } from '@nestjs/common'
import { SUBSCRIPTION_REPOSITORY_PORT } from '../../domain/repositories/subscription.repository.port'
import type { SubscriptionRepositoryPort } from '../../domain/repositories/subscription.repository.port'
import type { Subscription } from '../../domain/entities/subscription.entity'

/**
 * Caso de uso: retorna a assinatura atual do usuário.
 * Aplica expiração lazy (D8): `ACTIVE → EXPIRED` quando `current_period_end`
 * já passou, persistindo a transição.
 */
@Injectable()
export class GetSubscriptionUseCase {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY_PORT)
    private readonly subscriptions: SubscriptionRepositoryPort,
  ) {}

  async execute(
    userId: string,
    now = new Date(),
  ): Promise<Subscription | null> {
    const subscription = await this.subscriptions.findByUserId(userId)
    if (!subscription) {
      return null
    }

    const statusBefore = subscription.status
    subscription.expireIfDue(now)
    if (statusBefore === 'ACTIVE' && subscription.status === 'EXPIRED') {
      await this.subscriptions.save(subscription)
    }

    return subscription
  }
}
