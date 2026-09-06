import type { Order } from '../../domain/entities/order.entity'
import type { OrderStatus } from '../../domain/value-objects/order-status.vo'
import type { PaymentMethod } from '../../../../common/value-objects/payment-method.vo'

export interface OrderResponse {
  id: string
  status: OrderStatus
  quantity: number
  unitPriceCents: number
  freightPriceCents: number
  totalPriceCents: number
  paymentMethod: PaymentMethod
  paymentId: string | null
  shipTo: {
    postalCode: string
    street: string
    number: string
    city: string
    state: string
    name: string
    phone: string
  }
  freightServiceId: number | null
  createdAt: Date
  updatedAt: Date
  paidAt: Date | null
  shippedAt: Date | null
  deliveredAt: Date | null
  cancelledAt: Date | null
  refundedAt: Date | null
}

/**
 * Projeção camelCase do `Order` (domínio) para a camada HTTP.
 * Preços em centavos; os timestamps permitem montar a timeline da jornada
 * (created/paid/shipped/delivered) no front.
 */
export class OrderResponseMapper {
  static toResponse(order: Order): OrderResponse {
    return {
      id: order.id,
      status: order.status,
      quantity: order.quantity,
      unitPriceCents: order.unitPrice.amountInCents,
      freightPriceCents: order.freightPrice.amountInCents,
      totalPriceCents: order.totalPrice.amountInCents,
      paymentMethod: order.paymentMethod,
      paymentId: order.paymentId,
      shipTo: {
        postalCode: order.shipTo.postalCode,
        street: order.shipTo.street,
        number: order.shipTo.number,
        city: order.shipTo.city,
        state: order.shipTo.state,
        name: order.shipTo.name,
        phone: order.shipTo.phone,
      },
      freightServiceId: order.freightServiceId,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      paidAt: order.paidAt,
      shippedAt: order.shippedAt,
      deliveredAt: order.deliveredAt,
      cancelledAt: order.cancelledAt,
      refundedAt: order.refundedAt,
    }
  }
}
