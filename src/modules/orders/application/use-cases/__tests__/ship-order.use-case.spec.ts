import { Price } from '../../../../../common/value-objects/price.vo'
import { ShipTo } from '../../../domain/value-objects/ship-to.vo'
import { Order } from '../../../domain/entities/order.entity'
import { OrderNotFoundError, OrderNotPaidError } from '../../errors'
import { ShipOrderUseCase } from '../ship-order.use-case'

const shipTo = ShipTo.create({
  postalCode: '01310-100',
  street: 'Av. Paulista',
  number: '1000',
  city: 'São Paulo',
  state: 'SP',
  name: 'Fulano',
  phone: '11999999999',
})

function makePaidOrder(): Order {
  const order = Order.create({
    id: 'ord-1',
    buyerId: 'u1',
    productId: 'p1',
    unitPrice: Price.create(1990),
    paymentMethod: 'PIX',
    shipTo,
  })
  order.attachPayment('mp-1')
  order.markPaid()
  return order
}

function makeSut() {
  const orders = {
    findById: jest.fn(),
    save: jest.fn().mockImplementation(async (o: Order) => o),
  }
  const shipments = {
    save: jest.fn().mockImplementation(async (s: unknown) => s),
  }
  const audit = { log: jest.fn().mockResolvedValue(undefined) }

  const useCase = new ShipOrderUseCase(
    orders as never,
    shipments as never,
    audit as never,
  )

  return { orders, shipments, audit, useCase }
}

describe('ShipOrderUseCase', () => {
  it('marca SHIPPED e registra o envio com rastreio', async () => {
    const { orders, shipments, audit, useCase } = makeSut()
    orders.findById.mockResolvedValue(makePaidOrder())

    const result = await useCase.execute({
      orderId: 'ord-1',
      actorId: 'admin-1',
      meOrderId: 'me-1',
      protocol: 'P1',
      serviceId: 1,
      tracking: 'BR123',
      labelUrl: 'https://l/1',
    })

    expect(result.orderId).toBe('ord-1')
    expect(result.status).toBe('SHIPPED')
    expect(result.shipmentId).toBeDefined()
    expect(shipments.save).toHaveBeenCalled()
    const shipment = shipments.save.mock.calls[0][0] as {
      meOrderId: string
      status: string
      tracking: string
    }
    expect(shipment.meOrderId).toBe('me-1')
    expect(shipment.status).toBe('POSTED')
    expect(shipment.tracking).toBe('BR123')
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'order_shipped' }),
    )
  })

  it('marca SHIPPED sem criar envio quando não há dados de etiqueta', async () => {
    const { orders, shipments, useCase } = makeSut()
    orders.findById.mockResolvedValue(makePaidOrder())

    const result = await useCase.execute({
      orderId: 'ord-1',
      actorId: 'admin-1',
    })

    expect(result.status).toBe('SHIPPED')
    expect(result.shipmentId).toBeUndefined()
    expect(shipments.save).not.toHaveBeenCalled()
  })

  it('lança OrderNotFoundError se o pedido não existe', async () => {
    const { orders, useCase } = makeSut()
    orders.findById.mockResolvedValue(null)

    await expect(
      useCase.execute({ orderId: 'x', actorId: 'admin-1' }),
    ).rejects.toThrow(OrderNotFoundError)
  })

  it('lança OrderNotPaidError se o pedido não está PAID', async () => {
    const { orders, useCase } = makeSut()
    const pending = Order.create({
      id: 'ord-1',
      buyerId: 'u1',
      productId: 'p1',
      unitPrice: Price.create(1990),
      paymentMethod: 'PIX',
      shipTo,
    })
    orders.findById.mockResolvedValue(pending)

    await expect(
      useCase.execute({ orderId: 'ord-1', actorId: 'admin-1' }),
    ).rejects.toThrow(OrderNotPaidError)
  })
})
