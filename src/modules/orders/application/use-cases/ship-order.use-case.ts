import { Inject, Injectable } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { AUDIT_LOGGER_PORT, type AuditLoggerPort } from '../../../../common/ports/audit-logger.port'
import {
  ORDER_REPOSITORY_PORT,
  type OrderRepositoryPort,
} from '../../domain/repositories/order.repository.port'
import {
  SHIPMENT_REPOSITORY_PORT,
  type ShipmentRepositoryPort,
} from '../../domain/repositories/shipment.repository.port'
import { Shipment } from '../../domain/entities/shipment.entity'
import type { OrderStatus } from '../../domain/value-objects/order-status.vo'
import { OrderNotFoundError, OrderNotPaidError } from '../errors'

export interface ShipOrderInput {
  orderId: string
  actorId: string
  /** Id da etiqueta gerada (manual, no painel da ME). Obrigatório para rastreio. */
  meOrderId?: string
  protocol?: string
  serviceId?: number
  tracking?: string
  trackingUrl?: string
  labelUrl?: string
}

export interface ShipOrderResult {
  orderId: string
  status: OrderStatus
  shipmentId?: string
}

/**
 * Despacha o pedido (PAID → SHIPPED).
 *
 * No MVP a etiqueta é gerada manualmente pelo admin no painel da Melhor Envio;
 * aqui o admin apenas confirma a postagem e, opcionalmente, registra o id da
 * etiqueta (`meOrderId`) + código de rastreio para o `TrackOrderUseCase`.
 */
@Injectable()
export class ShipOrderUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY_PORT)
    private readonly orders: OrderRepositoryPort,
    @Inject(SHIPMENT_REPOSITORY_PORT)
    private readonly shipments: ShipmentRepositoryPort,
    @Inject(AUDIT_LOGGER_PORT)
    private readonly audit: AuditLoggerPort,
  ) {}

  async execute(input: ShipOrderInput): Promise<ShipOrderResult> {
    const order = await this.orders.findById(input.orderId)
    if (!order) {
      throw new OrderNotFoundError(input.orderId)
    }
    if (order.status !== 'PAID') {
      throw new OrderNotPaidError(input.orderId)
    }

    order.markShipped()
    await this.orders.save(order)

    let shipmentId: string | undefined
    if (input.meOrderId && input.protocol && input.serviceId) {
      const shipment = Shipment.create({
        id: randomUUID(),
        orderId: order.id,
        meOrderId: input.meOrderId,
        protocol: input.protocol,
        serviceId: input.serviceId,
        tracking: input.tracking ?? null,
        trackingUrl: input.trackingUrl ?? null,
        labelUrl: input.labelUrl ?? null,
      })
      shipment.markPosted()
      await this.shipments.save(shipment)
      shipmentId = shipment.id
    }

    await this.audit.log({
      userId: input.actorId,
      action: 'order_shipped',
      entity: 'Order',
      entityId: order.id,
      metadata: { shipmentId: shipmentId ?? null },
    })

    return { orderId: order.id, status: order.status, shipmentId }
  }
}
