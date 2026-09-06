import { Price } from '../../../../../common/value-objects/price.vo'
import { ShipTo } from '../../../domain/value-objects/ship-to.vo'
import { Order } from '../../../domain/entities/order.entity'
import type { OrderModel } from '../../../../../generated/prisma/models/Order'
import { OrderMapper } from '../order.mapper'

const shipTo = ShipTo.create({
  postalCode: '01310-100',
  street: 'Av. Paulista',
  number: '1000',
  city: 'São Paulo',
  state: 'SP',
  name: 'Fulano',
  phone: '11999999999',
})

function makeOrder(): Order {
  const order = Order.create({
    id: 'ord-1',
    buyerId: 'u1',
    productId: 'p1',
    unitPrice: Price.create(1990),
    quantity: 2,
    freightPrice: Price.create(1860),
    paymentMethod: 'PIX',
    shipTo,
    freightServiceId: 1,
  })
  order.attachPayment('mp-1')
  return order
}

describe('OrderMapper', () => {
  it('toPersistence mapeia para snake_case + centavos', () => {
    const p = OrderMapper.toPersistence(makeOrder())

    expect(p.id).toBe('ord-1')
    expect(p.buyer_id).toBe('u1')
    expect(p.product_id).toBe('p1')
    expect(p.unit_price).toBe(1990)
    expect(p.quantity).toBe(2)
    expect(p.freight_price).toBe(1860)
    expect(p.status).toBe('PENDING')
    expect(p.payment_id).toBe('mp-1')
    expect(p.payment_method).toBe('PIX')
    expect(p.ship_postal_code).toBe('01310100')
    expect(p.ship_street).toBe('Av. Paulista')
    expect(p.ship_state).toBe('SP')
    expect(p.ship_name).toBe('Fulano')
    expect(p.freight_service_id).toBe(1)
    expect(p.paid_at).toBeNull()
  })

  it('toDomain reconstitute a partir do model', () => {
    const paidAt = new Date('2026-09-05T00:00:00.000Z')
    const model = {
      id: 'ord-1',
      buyer_id: 'u1',
      product_id: 'p1',
      unit_price: 1990,
      quantity: 2,
      freight_price: 1860,
      status: 'PAID',
      payment_id: 'mp-1',
      payment_method: 'PIX',
      ship_postal_code: '01310100',
      ship_street: 'Av. Paulista',
      ship_number: '1000',
      ship_city: 'São Paulo',
      ship_state: 'SP',
      ship_name: 'Fulano',
      ship_phone: '11999999999',
      freight_service_id: 1,
      paid_at: paidAt,
      shipped_at: null,
      delivered_at: null,
      cancelled_at: null,
      refunded_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    } as unknown as OrderModel

    const order = OrderMapper.toDomain(model)

    expect(order.id).toBe('ord-1')
    expect(order.status).toBe('PAID')
    expect(order.quantity).toBe(2)
    expect(order.totalPrice.amountInCents).toBe(1990 * 2 + 1860)
    expect(order.shipTo.postalCode).toBe('01310100')
    expect(order.shipTo.state).toBe('SP')
    expect(order.paidAt).toEqual(paidAt)
    expect(order.freightServiceId).toBe(1)
  })
})
