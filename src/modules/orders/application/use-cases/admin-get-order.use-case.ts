import { Inject, Injectable } from '@nestjs/common'
import {
  ORDER_REPOSITORY_PORT,
  type OrderRepositoryPort,
} from '../../domain/repositories/order.repository.port'
import type { Order } from '../../domain/entities/order.entity'
import { OrderNotFoundError } from '../errors'

export interface AdminGetOrderInput {
  orderId: string
}

/**
 * Detalha uma venda para o admin (sem filtro de ownership — auditoria).
 * Pedido inexistente → `OrderNotFoundError` (404).
 */
@Injectable()
export class AdminGetOrderUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY_PORT)
    private readonly orders: OrderRepositoryPort,
  ) {}

  async execute(input: AdminGetOrderInput): Promise<Order> {
    const order = await this.orders.findById(input.orderId)
    if (!order) {
      throw new OrderNotFoundError(input.orderId)
    }
    return order
  }
}
