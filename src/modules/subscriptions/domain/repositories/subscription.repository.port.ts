import type { Subscription } from '../entities/subscription.entity'

/**
 * Porta do repositório de assinaturas (modelo B: recorrência nossa).
 * `findByUserId` retorna a assinatura mais recente; `findActiveByUserId`
 * retorna a ativa (ACTIVE/TRIALING) para o Feature System.
 */
export interface SubscriptionRepositoryPort {
  save(subscription: Subscription): Promise<void>
  findById(id: string): Promise<Subscription | null>
  findByUserId(userId: string): Promise<Subscription | null>
  findActiveByUserId(userId: string): Promise<Subscription | null>
}

export const SUBSCRIPTION_REPOSITORY_PORT = Symbol(
  'SUBSCRIPTION_REPOSITORY_PORT',
)
