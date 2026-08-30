import type { Subscription } from '../entities/subscription.entity'

/**
 * Filtro da listagem administrativa de assinaturas.
 *
 * - `status`   → status da assinatura (enum `SubscriptionStatus`).
 * - `planCode` → código do plano (ex.: `PREMIUM`).
 * - `userId`   → dono (id do usuário).
 */
export interface ListSubscriptionsFilter {
  page: number
  limit: number
  status?: string
  planCode?: string
  userId?: string
}

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
  list(filter: ListSubscriptionsFilter): Promise<Subscription[]>
  count(filter: ListSubscriptionsFilter): Promise<number>
}

export const SUBSCRIPTION_REPOSITORY_PORT = Symbol(
  'SUBSCRIPTION_REPOSITORY_PORT',
)
