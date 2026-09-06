import { Inject, Injectable } from '@nestjs/common'
import { AUDIT_LOGGER_PORT, type AuditLoggerPort } from '../../../../common/ports/audit-logger.port'
import {
  ORDER_REPOSITORY_PORT,
  type OrderRepositoryPort,
} from '../../domain/repositories/order.repository.port'
import {
  SHIPMENT_REPOSITORY_PORT,
  type ShipmentRepositoryPort,
} from '../../domain/repositories/shipment.repository.port'
import type { OrderStatus } from '../../domain/value-objects/order-status.vo'
import type { ShipmentStatus } from '../../domain/value-objects/shipment-status.vo'

export interface ProcessShippingWebhookInput {
  event: string
  data: {
    /** Id da etiqueta na Melhor Envio (= `me_order_id` do `Shipment`). */
    id: string
    protocol?: string
    status?: string
    tracking?: string
    trackingUrl?: string
    labelUrl?: string
  }
}

export interface ProcessShippingWebhookResult {
  processed: boolean
  orderId?: string
  orderStatus?: OrderStatus
  shipmentStatus?: ShipmentStatus
}

/**
 * Processa o webhook da Melhor Envio (`POST /webhooks/melhor-envio`).
 *
 * A assinatura HMAC é validada no controller (`SHIPPING_WEBHOOK_VALIDATOR_PORT`);
 * aqui só avançamos as máquinas de estado:
 * - `order.posted`    → `Shipment` POSTED.
 * - `order.delivered` → `Shipment` DELIVERED + `Order` DELIVERED.
 *
 * Idempotente: transições já aplicadas (ou fora de ordem) → `processed: false`.
 */
@Injectable()
export class ProcessShippingWebhookUseCase {
  constructor(
    @Inject(SHIPMENT_REPOSITORY_PORT)
    private readonly shipments: ShipmentRepositoryPort,
    @Inject(ORDER_REPOSITORY_PORT)
    private readonly orders: OrderRepositoryPort,
    @Inject(AUDIT_LOGGER_PORT)
    private readonly audit: AuditLoggerPort,
  ) {}

  async execute(
    input: ProcessShippingWebhookInput,
  ): Promise<ProcessShippingWebhookResult> {
    const shipment = await this.shipments.findByMeOrderId(input.data.id)
    if (!shipment) {
      return { processed: false }
    }

    const order = await this.orders.findById(shipment.orderId)
    if (!order) {
      return { processed: false }
    }

    let shipmentChanged = false
    let orderChanged = false

    if (input.event === 'order.posted') {
      if (shipment.status === 'PENDING') {
        shipment.markPosted()
        shipmentChanged = true
      }
    } else if (input.event === 'order.delivered') {
      if (shipment.status === 'POSTED') {
        shipment.markDelivered()
        shipmentChanged = true
      }
      if (order.status === 'SHIPPED') {
        order.markDelivered()
        orderChanged = true
      }
    }

    if (!shipmentChanged && !orderChanged) {
      return { processed: false }
    }

    if (shipmentChanged) {
      await this.shipments.save(shipment)
    }
    if (orderChanged) {
      await this.orders.save(order)
    }

    await this.audit.log({
      userId: order.buyerId,
      action: input.event,
      entity: 'Shipment',
      entityId: shipment.id,
      metadata: { orderId: order.id, meOrderId: shipment.meOrderId },
    })

    return {
      processed: true,
      orderId: order.id,
      orderStatus: order.status,
      shipmentStatus: shipment.status,
    }
  }
}
