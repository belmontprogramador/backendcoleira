import { Inject, Injectable } from '@nestjs/common'
import { SUBSCRIPTION_REPOSITORY_PORT } from '../../domain/repositories/subscription.repository.port'
import type {
  ListSubscriptionsFilter,
  SubscriptionRepositoryPort,
} from '../../domain/repositories/subscription.repository.port'
import type { Subscription } from '../../domain/entities/subscription.entity'

/**
 * Resultado paginado da listagem de assinaturas.
 *
 * `total` é o total GLOBAL de assinaturas que batem com o filtro (ignorando a
 * página atual) — necessário para o front calcular o número de páginas.
 */
export interface PaginatedSubscriptionsResult {
  data: Subscription[]
  total: number
  page: number
  limit: number
}

/**
 * Caso de uso (admin): listar assinaturas com paginação e filtros.
 *
 * Retorna `data` (página atual) + `total` (contagem global) em uma única
 * chamada — `list` e `count` rodam em paralelo, sem N+1.
 */
@Injectable()
export class ListSubscriptionsUseCase {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY_PORT)
    private readonly subscriptions: SubscriptionRepositoryPort,
  ) {}

  async execute(
    filter: ListSubscriptionsFilter,
  ): Promise<PaginatedSubscriptionsResult> {
    const [data, total] = await Promise.all([
      this.subscriptions.list(filter),
      this.subscriptions.count(filter),
    ])
    return { data, total, page: filter.page, limit: filter.limit }
  }
}
