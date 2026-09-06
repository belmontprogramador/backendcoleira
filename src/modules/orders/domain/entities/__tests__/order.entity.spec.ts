import { Price } from '../../../../../common/value-objects/price.vo'
import { ShipTo } from '../../value-objects/ship-to.vo'
import type { OrderStatus } from '../../value-objects/order-status.vo'
import {
  InvalidOrderStatusTransitionError,
  Order,
} from '../order.entity'
import type { CreateOrderProps } from '../order.entity'

const shipTo = ShipTo.create({
  postalCode: '01310-100',
  street: 'Av. Paulista',
  number: '1000',
  city: 'São Paulo',
  state: 'SP',
  name: 'Fulano de Tal',
  phone: '(11) 99999-9999',
})

function makeOrder(overrides: Partial<CreateOrderProps> = {}): Order {
  return Order.create({
    id: 'order-1',
    buyerId: 'user-1',
    productId: 'prod-1',
    unitPrice: Price.create(1990),
    paymentMethod: 'PIX',
    shipTo,
    ...overrides,
  })
}

function reconstitute(status: OrderStatus): Order {
  return Order.reconstitute({
    id: 'order-1',
    buyerId: 'user-1',
    productId: 'prod-1',
    unitPrice: Price.create(1990),
    quantity: 1,
    freightPrice: Price.zero(),
    status,
    paymentId: null,
    paymentMethod: 'PIX',
    shipTo,
    freightServiceId: null,
    paidAt: null,
    shippedAt: null,
    deliveredAt: null,
    cancelledAt: null,
    refundedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  })
}

function transition(order: Order, to: OrderStatus): void {
  switch (to) {
    case 'PAID':
      order.markPaid()
      break
    case 'SHIPPED':
      order.markShipped()
      break
    case 'DELIVERED':
      order.markDelivered()
      break
    case 'CANCELLED':
      order.cancel()
      break
    case 'REFUNDED':
      order.refund()
      break
  }
}

describe('Order', () => {
  it('cria com defaults (qty 1, frete 0, PENDING)', () => {
    const order = makeOrder()
    expect(order.quantity).toBe(1)
    expect(order.freightPrice.amountInCents).toBe(0)
    expect(order.status).toBe('PENDING')
    expect(order.paymentId).toBeNull()
    expect(order.freightServiceId).toBeNull()
  })

  it('calcula totalPrice = unitPrice * qty + freight', () => {
    const order = makeOrder({ quantity: 2, freightPrice: Price.create(500) })
    expect(order.totalPrice.amountInCents).toBe(1990 * 2 + 500)
  })

  it('rejeita quantidade < 1', () => {
    expect(() => makeOrder({ quantity: 0 })).toThrow()
  })

  it('rejeita quantidade não inteira', () => {
    expect(() => makeOrder({ quantity: 1.5 })).toThrow()
  })

  describe('máquina de estados', () => {
    it('percorre o fluxo feliz PENDING → PAID → SHIPPED → DELIVERED', () => {
      const order = makeOrder()
      order.markPaid()
      expect(order.status).toBe('PAID')
      expect(order.paidAt).toBeInstanceOf(Date)

      order.markShipped()
      expect(order.status).toBe('SHIPPED')
      expect(order.shippedAt).toBeInstanceOf(Date)

      order.markDelivered()
      expect(order.status).toBe('DELIVERED')
      expect(order.deliveredAt).toBeInstanceOf(Date)
    })

    it('cancela de PENDING', () => {
      const order = makeOrder()
      order.cancel()
      expect(order.status).toBe('CANCELLED')
      expect(order.cancelledAt).toBeInstanceOf(Date)
    })

    it('reembolsa de PAID', () => {
      const order = makeOrder()
      order.markPaid()
      order.refund()
      expect(order.status).toBe('REFUNDED')
      expect(order.refundedAt).toBeInstanceOf(Date)
    })

    it('reembolsa de SHIPPED', () => {
      const order = makeOrder()
      order.markPaid()
      order.markShipped()
      order.refund()
      expect(order.status).toBe('REFUNDED')
    })

    const INVALID: Array<[OrderStatus, OrderStatus]> = [
      ['PAID', 'CANCELLED'],
      ['PAID', 'DELIVERED'],
      ['PENDING', 'SHIPPED'],
      ['PENDING', 'DELIVERED'],
      ['PENDING', 'REFUNDED'],
      ['SHIPPED', 'PAID'],
      ['DELIVERED', 'PAID'],
      ['CANCELLED', 'PAID'],
      ['REFUNDED', 'PAID'],
    ]

    it.each(INVALID)(
      'rejeita transição inválida %s → %s',
      (from, to) => {
        const order = reconstitute(from)
        expect(() => transition(order, to)).toThrow(
          InvalidOrderStatusTransitionError,
        )
      },
    )
  })

  it('attachPayment associa o id do pagamento sem mudar o status', () => {
    const order = makeOrder()
    order.attachPayment('mp-123')
    expect(order.paymentId).toBe('mp-123')
    expect(order.status).toBe('PENDING')
  })

  it('reconstitute restaura todos os campos', () => {
    const createdAt = new Date('2026-01-01T00:00:00Z')
    const updatedAt = new Date('2026-01-02T00:00:00Z')
    const order = Order.reconstitute({
      id: 'order-1',
      buyerId: 'user-1',
      productId: 'prod-1',
      unitPrice: Price.create(1990),
      quantity: 3,
      freightPrice: Price.create(700),
      status: 'SHIPPED',
      paymentId: 'mp-1',
      paymentMethod: 'CARD',
      shipTo,
      freightServiceId: 4,
      paidAt: new Date('2026-01-01T01:00:00Z'),
      shippedAt: new Date('2026-01-01T02:00:00Z'),
      deliveredAt: null,
      cancelledAt: null,
      refundedAt: null,
      createdAt,
      updatedAt,
    })

    expect(order.id).toBe('order-1')
    expect(order.status).toBe('SHIPPED')
    expect(order.totalPrice.amountInCents).toBe(1990 * 3 + 700)
    expect(order.shipTo).toBe(shipTo)
    expect(order.paymentMethod).toBe('CARD')
    expect(order.createdAt).toBe(createdAt)
  })
})
