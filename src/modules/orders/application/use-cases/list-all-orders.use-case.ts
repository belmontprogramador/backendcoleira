import { Inject, Injectable } from '@nestjs/common'
import {
  ORDER_REPOSITORY_PORT,
  type OrderRepositoryPort,
} from '../../domain/repositories/order.repository.port'
import type { Order } from '../../domain/entities/order.entity'
import type { OrderStatus } from '../../domain/value-objects/order-status.vo'

export interface PaginatedOrdersResult {
  data: Order[]
  total: number
  page: number
  limit: number
}

export interface ListAllOrdersInput {
  page: number
  limit: number
  status?: OrderStatus
}

/**
 * Lista todos os pedidos (admin), com filtro por status e paginação.
 * `total` é o total global do filtro (ignorando paginação).
 */
@Injectable()
export class ListAllOrdersUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY_PORT)
    private readonly orders: OrderRepositoryPort,
  ) {}

  async execute(input: ListAllOrdersInput): Promise<PaginatedOrdersResult> {
    const filter = {
      page: input.page,
      limit: input.limit,
      status: input.status,
    }
    const [data, total] = await Promise.all([
      this.orders.list(filter),
      this.orders.count(filter),
    ])
    return { data, total, page: input.page, limit: input.limit }
  }
}
