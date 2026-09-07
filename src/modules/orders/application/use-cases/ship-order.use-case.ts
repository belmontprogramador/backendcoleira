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
import {
  SHIPPING_GATEWAY_PORT,
  type ShippingGatewayPort,
  type ShippingAddress,
} from '../../../../common/ports/shipping-gateway.port'
import { SHIPPING_ORIGIN_PORT } from '../../../../common/ports/shipping-origin.port'
import { Shipment } from '../../domain/entities/shipment.entity'
import { Order } from '../../domain/entities/order.entity'
import { PINGENTE_PACKAGE } from '../../domain/constants/pingente-package'
import type { OrderStatus } from '../../domain/value-objects/order-status.vo'
import {
  OrderNotFoundError,
  OrderNotPaidError,
  OrderFreightError,
} from '../errors'

export interface ShipOrderInput {
  orderId: string
  actorId: string
  /**
   * Fallback manual: id da etiqueta gerada no painel da Melhor Envio. Quando
   * os três (`meOrderId`/`protocol`/`serviceId`) estão ausentes, a etiqueta é
   * gerada automaticamente via `ShippingGatewayPort`.
   */
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
  labelUrl?: string | null
  tracking?: string | null
}

/**
 * Despacha o pedido (PAID → SHIPPED).
 *
 * Fluxo automático (padrão): quando o admin não informa os dados manuais da
 * etiqueta, gera tudo na Melhor Envio — carrinho (`createShipment`) → pagamento
 * (`payShipment`, saldo da carteira ME) → geração (`generateLabel`) → impressão
 * (`printLabel`) — e registra o `Shipment` com `meOrderId`/`protocol`/`serviceId`
 * + `labelUrl` para impressão. O fallback manual continua disponível para quando
 * a etiqueta foi gerada fora do fluxo (painel ME).
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
    @Inject(SHIPPING_GATEWAY_PORT)
    private readonly shipping: ShippingGatewayPort,
    @Inject(SHIPPING_ORIGIN_PORT)
    private readonly origin: ShippingAddress,
  ) {}

  async execute(input: ShipOrderInput): Promise<ShipOrderResult> {
    const order = await this.orders.findById(input.orderId)
    if (!order) {
      throw new OrderNotFoundError(input.orderId)
    }
    if (order.status !== 'PAID') {
      throw new OrderNotPaidError(input.orderId)
    }

    let meOrderId = input.meOrderId
    let protocol = input.protocol
    let serviceId = input.serviceId
    const tracking = input.tracking ?? null
    const trackingUrl = input.trackingUrl ?? null
    let labelUrl = input.labelUrl ?? null

    const hasManual = !!(input.meOrderId && input.protocol && input.serviceId)
    if (!hasManual) {
      const generated = await this.generateShipment(order)
      meOrderId = generated.meOrderId
      protocol = generated.protocol
      serviceId = generated.serviceId
      labelUrl = generated.labelUrl
    }

    order.markShipped()
    await this.orders.save(order)

    let shipmentId: string | undefined
    if (meOrderId && protocol && serviceId) {
      const shipment = Shipment.create({
        id: randomUUID(),
        orderId: order.id,
        meOrderId,
        protocol,
        serviceId,
        tracking,
        trackingUrl,
        labelUrl,
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
      metadata: { shipmentId: shipmentId ?? null, labelUrl },
    })

    return {
      orderId: order.id,
      status: order.status,
      shipmentId,
      labelUrl,
      tracking,
    }
  }

  /**
   * Gera a etiqueta na Melhor Envio a partir do serviço de frete e do endereço
   * do pedido (carrinho → pagamento → geração → impressão).
   */
  private async generateShipment(order: Order): Promise<{
    meOrderId: string
    protocol: string
    serviceId: number
    labelUrl: string
  }> {
    const serviceId = order.freightServiceId
    if (!serviceId) {
      throw new OrderFreightError(
        'Pedido sem serviço de frete — não é possível gerar a etiqueta',
      )
    }

    const created = await this.shipping.createShipment({
      service: serviceId,
      from: this.origin,
      to: this.toAddress(order),
      products: [{ ...PINGENTE_PACKAGE, quantity: order.quantity }],
    })
    await this.shipping.payShipment([created.orderId])
    await this.shipping.generateLabel([created.orderId])
    const labelUrl = await this.shipping.printLabel('private', [created.orderId])

    return {
      meOrderId: created.orderId,
      protocol: created.protocol,
      serviceId,
      labelUrl,
    }
  }

  private toAddress(order: Order): ShippingAddress {
    const s = order.shipTo
    return {
      name: s.name,
      phone: s.phone,
      email: '',
      postalCode: s.postalCode,
      address: `${s.street}, ${s.number}`,
      city: s.city,
      stateAbbr: s.state,
    }
  }
}
