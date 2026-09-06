import { Inject, Injectable } from '@nestjs/common'
import {
  PAYMENT_GATEWAY_PORT,
  type PaymentGatewayPort,
} from '../../../../common/ports/payment-gateway.port'
import { AUDIT_LOGGER_PORT, type AuditLoggerPort } from '../../../../common/ports/audit-logger.port'
import {
  ORDER_REPOSITORY_PORT,
  type OrderRepositoryPort,
} from '../../domain/repositories/order.repository.port'
import type { OrderStatus } from '../../domain/value-objects/order-status.vo'

export interface PayOrderWebhookInput {
  paymentId: string
}

export interface PayOrderWebhookResult {
  processed: boolean
  orderId?: string
  orderStatus?: OrderStatus
}

/**
 * Processa o webhook do Mercado Pago (pagamento da venda).
 *
 * O payload do MP não embute o `status` — o use case consulta o gateway
 * (`getPayment`) e só então avança a máquina de estados do `Order`.
 * Idempotente: transições fora de ordem (ex.: APPROVED num pedido já PAID)
 * não lançam — apenas retornam `processed: false`.
 */
@Injectable()
export class PayOrderWebhookUseCase {
  constructor(
    @Inject(PAYMENT_GATEWAY_PORT)
    private readonly payments: PaymentGatewayPort,
    @Inject(ORDER_REPOSITORY_PORT)
    private readonly orders: OrderRepositoryPort,
    @Inject(AUDIT_LOGGER_PORT)
    private readonly audit: AuditLoggerPort,
  ) {}

  async execute(input: PayOrderWebhookInput): Promise<PayOrderWebhookResult> {
    const payment = await this.payments.getPayment(input.paymentId)
    const order = await this.orders.findByPaymentId(input.paymentId)
    if (!order) {
      return { processed: false }
    }

    let action: 'order_paid' | 'order_cancelled' | 'order_refunded' | null = null

    if (payment.status === 'APPROVED' && order.status === 'PENDING') {
      order.markPaid()
      action = 'order_paid'
    } else if (
      (payment.status === 'REJECTED' || payment.status === 'CHARGED_BACK') &&
      order.status === 'PENDING'
    ) {
      order.cancel()
      action = 'order_cancelled'
    } else if (
      payment.status === 'REFUNDED' &&
      (order.status === 'PAID' || order.status === 'SHIPPED')
    ) {
      order.refund()
      action = 'order_refunded'
    }

    if (!action) {
      return { processed: false }
    }

    await this.orders.save(order)
    await this.audit.log({
      userId: order.buyerId,
      action,
      entity: 'Order',
      entityId: order.id,
      metadata: {
        paymentId: input.paymentId,
        paymentStatus: payment.status,
      },
    })

    return { processed: true, orderId: order.id, orderStatus: order.status }
  }
}
