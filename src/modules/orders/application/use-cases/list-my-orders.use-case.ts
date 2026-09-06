import { Inject, Injectable } from '@nestjs/common'
import {
  ORDER_REPOSITORY_PORT,
  type OrderRepositoryPort,
} from '../../domain/repositories/order.repository.port'
import type { PaginatedOrdersResult } from './list-all-orders.use-case'

export interface ListMyOrdersInput {
  buyerId: string
  page: number
  limit: number
}

/**
 * Lista os pedidos do cliente logado (sempre filtrados por `buyerId`).
 * `total` é o total global de pedidos do comprador.
 */
@Injectable()
export class ListMyOrdersUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY_PORT)
    private readonly orders: OrderRepositoryPort,
  ) {}

  async execute(input: ListMyOrdersInput): Promise<PaginatedOrdersResult> {
    const filter = {
      buyerId: input.buyerId,
      page: input.page,
      limit: input.limit,
    }
    const [data, total] = await Promise.all([
      this.orders.list(filter),
      this.orders.count(filter),
    ])
    return { data, total, page: input.page, limit: input.limit }
  }
}
