import { Price } from '../../../../../common/value-objects/price.vo'
import { ShipTo } from '../../../domain/value-objects/ship-to.vo'
import { Order } from '../../../domain/entities/order.entity'
import { Shipment } from '../../../domain/entities/shipment.entity'
import { ProcessShippingWebhookUseCase } from '../process-shipping-webhook.use-case'

const shipTo = ShipTo.create({
  postalCode: '01310-100',
  street: 'Av. Paulista',
  number: '1000',
  city: 'São Paulo',
  state: 'SP',
  name: 'Fulano',
  phone: '11999999999',
})

function makeShippedOrder(): Order {
  const order = Order.create({
    id: 'ord-1',
    buyerId: 'u1',
    productId: 'p1',
    unitPrice: Price.create(1990),
    paymentMethod: 'PIX',
    shipTo,
  })
  order.markPaid()
  order.markShipped()
  return order
}

function makePostedShipment(): Shipment {
  const shipment = Shipment.create({
    id: 'shp-1',
    orderId: 'ord-1',
    meOrderId: 'me-1',
    protocol: 'P1',
    serviceId: 1,
  })
  shipment.markPosted()
  return shipment
}

describe('ProcessShippingWebhookUseCase', () => {
  function build(overrides?: {
    shipment?: Shipment | null
    order?: Order | null
  }) {
    const shipment = overrides?.shipment === undefined
      ? makePostedShipment()
      : overrides.shipment
    const order = overrides?.order === undefined
      ? makeShippedOrder()
      : overrides.order

    const shipments = {
      findByMeOrderId: jest.fn().mockResolvedValue(shipment),
      save: jest.fn().mockImplementation(async (s: Shipment) => s),
    }
    const orders = {
      findById: jest.fn().mockResolvedValue(order),
      save: jest.fn().mockImplementation(async (o: Order) => o),
    }
    const audit = { log: jest.fn().mockResolvedValue(undefined) }
    const useCase = new ProcessShippingWebhookUseCase(
      shipments as never,
      orders as never,
      audit as never,
    )
    return { shipments, orders, audit, useCase }
  }

  it('order.delivered avança Shipment + Order para DELIVERED', async () => {
    const { orders, shipments, useCase } = build()

    const result = await useCase.execute({
      event: 'order.delivered',
      data: { id: 'me-1' },
    })

    expect(result.processed).toBe(true)
    expect(result.orderStatus).toBe('DELIVERED')
    expect(result.shipmentStatus).toBe('DELIVERED')
    expect(shipments.save).toHaveBeenCalled()
    expect(orders.save).toHaveBeenCalled()
  })

  it('order.posted avança Shipment PENDING → POSTED', async () => {
    const shipment = Shipment.create({
      id: 'shp-1',
      orderId: 'ord-1',
      meOrderId: 'me-1',
      protocol: 'P1',
      serviceId: 1,
    })
    const { orders, useCase } = build({ shipment })

    const result = await useCase.execute({
      event: 'order.posted',
      data: { id: 'me-1' },
    })

    expect(result.processed).toBe(true)
    expect(result.shipmentStatus).toBe('POSTED')
    expect(orders.save).not.toHaveBeenCalled()
  })

  it('retorna processed:false quando não há shipment (idempotente)', async () => {
    const { useCase } = build({ shipment: null })

    const result = await useCase.execute({
      event: 'order.delivered',
      data: { id: 'desconhecido' },
    })

    expect(result.processed).toBe(false)
  })

  it('ignora eventos desconhecidos', async () => {
    const { useCase } = build()

    const result = await useCase.execute({
      event: 'order.paused',
      data: { id: 'me-1' },
    })

    expect(result.processed).toBe(false)
  })
})
