import { Inject, Injectable } from '@nestjs/common'
import { AUDIT_LOGGER_PORT, type AuditLoggerPort } from '../../../../common/ports/audit-logger.port'
import {
  ORDER_REPOSITORY_PORT,
  type OrderRepositoryPort,
} from '../../domain/repositories/order.repository.port'
import { InvalidOrderStatusTransitionError } from '../../domain/entities/order.entity'
import type { OrderStatus } from '../../domain/value-objects/order-status.vo'
import { OrderNotFoundError, OrderStatusConflictError } from '../errors'

export type AdminOrderStatusTarget = 'DELIVERED' | 'CANCELLED' | 'REFUNDED'

export interface AdminUpdateOrderStatusInput {
  orderId: string
  actorId: string
  status: AdminOrderStatusTarget
}

export interface AdminUpdateOrderStatusResult {
  orderId: string
  status: OrderStatus
}

/**
 * Ajuste manual de status de venda pelo admin (`PATCH /admin/orders/:id/status`).
 *
 * - `DELIVERED` — SHIPPED → DELIVERED (quando o webhook ME não está ativo).
 * - `CANCELLED` — PENDING → CANCELLED (cancelamento antes do pagamento).
 * - `REFUNDED`  — PAID|SHIPPED → REFUNDED (estorno/retorno).
 *
 * Transição inválida (fora da máquina de estados) → 409.
 */
@Injectable()
export class AdminUpdateOrderStatusUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY_PORT)
    private readonly orders: OrderRepositoryPort,
    @Inject(AUDIT_LOGGER_PORT)
    private readonly audit: AuditLoggerPort,
  ) {}

  async execute(
    input: AdminUpdateOrderStatusInput,
  ): Promise<AdminUpdateOrderStatusResult> {
    const order = await this.orders.findById(input.orderId)
    if (!order) {
      throw new OrderNotFoundError(input.orderId)
    }

    const from = order.status
    try {
      if (input.status === 'DELIVERED') {
        order.markDelivered()
      } else if (input.status === 'CANCELLED') {
        order.cancel()
      } else {
        order.refund()
      }
    } catch (error) {
      if (error instanceof InvalidOrderStatusTransitionError) {
        throw new OrderStatusConflictError(from, input.status)
      }
      throw error
    }

    await this.orders.save(order)
    await this.audit.log({
      userId: input.actorId,
      action: 'order_status_changed',
      entity: 'Order',
      entityId: order.id,
      metadata: { from, to: input.status },
    })

    return { orderId: order.id, status: order.status }
  }
}
