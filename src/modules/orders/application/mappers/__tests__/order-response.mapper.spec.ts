import { Price } from '../../../../../common/value-objects/price.vo'
import { ShipTo } from '../../../domain/value-objects/ship-to.vo'
import { Order } from '../../../domain/entities/order.entity'
import { OrderResponseMapper } from '../order-response.mapper'

const shipTo = ShipTo.create({
  postalCode: '01310-100',
  street: 'Av. Paulista',
  number: '1000',
  city: 'São Paulo',
  state: 'SP',
  name: 'Fulano',
  phone: '11999999999',
})

describe('OrderResponseMapper', () => {
  it('projeta o Order em camelCase com preços em centavos', () => {
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
    order.markPaid()

    const response = OrderResponseMapper.toResponse(order)

    expect(response.id).toBe('ord-1')
    expect(response.status).toBe('PAID')
    expect(response.quantity).toBe(2)
    expect(response.unitPriceCents).toBe(1990)
    expect(response.freightPriceCents).toBe(1860)
    expect(response.totalPriceCents).toBe(1990 * 2 + 1860)
    expect(response.paymentMethod).toBe('PIX')
    expect(response.paymentId).toBe('mp-1')
    expect(response.shipTo).toEqual({
      postalCode: '01310100',
      street: 'Av. Paulista',
      number: '1000',
      city: 'São Paulo',
      state: 'SP',
      name: 'Fulano',
      phone: '11999999999',
    })
    expect(response.freightServiceId).toBe(1)
    expect(response.paidAt).not.toBeNull()
    expect(response.shippedAt).toBeNull()
    expect(response.deliveredAt).toBeNull()
    expect(response.cancelledAt).toBeNull()
    expect(response.refundedAt).toBeNull()
    expect(response.createdAt).toBeInstanceOf(Date)
  })
})
