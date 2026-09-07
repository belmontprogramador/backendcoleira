import { Order } from '../../domain/entities/order.entity'
import { Price } from '../../../../common/value-objects/price.vo'
import { ShipTo } from '../../domain/value-objects/ship-to.vo'
import type { PaymentMethod } from '../../../../common/value-objects/payment-method.vo'
import type { OrderStatus } from '../../domain/value-objects/order-status.vo'
import type { OrderModel } from '../../../../generated/prisma/models/Order'

/**
 * Converte a entidade `Order` (domínio) para o formato de persistência Prisma
 * (snake_case) e vice-versa. Preços em centavos; o endereço de entrega é um
 * snapshot (ship_*) e `total_price` é derivado no domínio (não persistido).
 */
export class OrderMapper {
  static toPersistence(order: Order): {
    id: string
    buyer_id: string
    product_id: string
    unit_price: number
    quantity: number
    freight_price: number
    status: OrderStatus
    payment_id: string | null
    payment_method: PaymentMethod
    ship_postal_code: string
    ship_street: string
    ship_number: string
    ship_city: string
    ship_state: string
    ship_name: string
    ship_phone: string
    ship_district: string | null
    ship_document: string | null
    freight_service_id: number | null
    paid_at: Date | null
    shipped_at: Date | null
    delivered_at: Date | null
    cancelled_at: Date | null
    refunded_at: Date | null
    created_at: Date
    updated_at: Date
  } {
    return {
      id: order.id,
      buyer_id: order.buyerId,
      product_id: order.productId,
      unit_price: order.unitPrice.amountInCents,
      quantity: order.quantity,
      freight_price: order.freightPrice.amountInCents,
      status: order.status,
      payment_id: order.paymentId,
      payment_method: order.paymentMethod,
      ship_postal_code: order.shipTo.postalCode,
      ship_street: order.shipTo.street,
      ship_number: order.shipTo.number,
      ship_city: order.shipTo.city,
      ship_state: order.shipTo.state,
      ship_name: order.shipTo.name,
      ship_phone: order.shipTo.phone,
      ship_district: order.shipTo.district,
      ship_document: order.shipTo.document,
      freight_service_id: order.freightServiceId,
      paid_at: order.paidAt,
      shipped_at: order.shippedAt,
      delivered_at: order.deliveredAt,
      cancelled_at: order.cancelledAt,
      refunded_at: order.refundedAt,
      created_at: order.createdAt,
      updated_at: order.updatedAt,
    }
  }

  static toDomain(model: OrderModel): Order {
    return Order.reconstitute({
      id: model.id,
      buyerId: model.buyer_id,
      productId: model.product_id,
      unitPrice: Price.create(model.unit_price),
      quantity: model.quantity,
      freightPrice: Price.create(model.freight_price),
      status: model.status,
      paymentId: model.payment_id,
      paymentMethod: model.payment_method,
      shipTo: ShipTo.create({
        postalCode: model.ship_postal_code,
        street: model.ship_street,
        number: model.ship_number,
        city: model.ship_city,
        state: model.ship_state,
        name: model.ship_name,
        phone: model.ship_phone,
        district: model.ship_district ?? undefined,
        document: model.ship_document ?? undefined,
      }),
      freightServiceId: model.freight_service_id,
      paidAt: model.paid_at,
      shippedAt: model.shipped_at,
      deliveredAt: model.delivered_at,
      cancelledAt: model.cancelled_at,
      refundedAt: model.refunded_at,
      createdAt: model.created_at,
      updatedAt: model.updated_at,
    })
  }
}
