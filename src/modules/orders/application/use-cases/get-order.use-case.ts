import { Inject, Injectable } from '@nestjs/common'
import {
  ORDER_REPOSITORY_PORT,
  type OrderRepositoryPort,
} from '../../domain/repositories/order.repository.port'
import type { Order } from '../../domain/entities/order.entity'
import { OrderNotFoundError } from '../errors'

export interface GetOrderInput {
  orderId: string
  viewerId: string
}

/**
 * Detalha um pedido do cliente (ownership — anti-IDOR).
 * Pedido inexistente OU de outro usuário → `OrderNotFoundError` (404), para
 * não vazar a existência de pedidos de terceiros.
 */
@Injectable()
export class GetOrderUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY_PORT)
    private readonly orders: OrderRepositoryPort,
  ) {}

  async execute(input: GetOrderInput): Promise<Order> {
    const order = await this.orders.findById(input.orderId)
    if (!order || order.buyerId !== input.viewerId) {
      throw new OrderNotFoundError(input.orderId)
    }
    return order
  }
}
