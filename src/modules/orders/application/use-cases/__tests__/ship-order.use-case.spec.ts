import { Price } from '../../../../../common/value-objects/price.vo'
import { ShipTo } from '../../../domain/value-objects/ship-to.vo'
import { Order } from '../../../domain/entities/order.entity'
import {
  OrderNotFoundError,
  OrderNotPaidError,
  OrderFreightError,
} from '../../errors'
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

const origin = {
  name: 'Elopet',
  phone: '22999990000',
  email: 'contato@elopet.online',
  postalCode: '28979608',
  address: 'Rua X, 1',
  city: 'Araruama',
  stateAbbr: 'RJ',
}

function makePaidOrder(freightServiceId?: number): Order {
  const order = Order.create({
    id: 'ord-1',
    buyerId: 'u1',
    productId: 'p1',
    unitPrice: Price.create(1990),
    paymentMethod: 'PIX',
    shipTo,
    freightServiceId: freightServiceId ?? null,
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
  const shipping = {
    createShipment: jest.fn(),
    payShipment: jest.fn().mockResolvedValue(undefined),
    generateLabel: jest.fn().mockResolvedValue(undefined),
    printLabel: jest.fn(),
  }

  const useCase = new ShipOrderUseCase(
    orders as never,
    shipments as never,
    audit as never,
    shipping as never,
    origin as never,
  )

  return { orders, shipments, audit, shipping, useCase }
}

describe('ShipOrderUseCase', () => {
  it('marca SHIPPED e registra o envio manual com rastreio', async () => {
    const { orders, shipments, audit, shipping, useCase } = makeSut()
    orders.findById.mockResolvedValue(makePaidOrder(1))

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
    expect(result.labelUrl).toBe('https://l/1')
    expect(shipments.save).toHaveBeenCalled()
    const shipment = shipments.save.mock.calls[0][0] as {
      meOrderId: string
      status: string
      tracking: string
    }
    expect(shipment.meOrderId).toBe('me-1')
    expect(shipment.status).toBe('POSTED')
    expect(shipment.tracking).toBe('BR123')
    // No fluxo manual o gateway NÃO é chamado.
    expect(shipping.createShipment).not.toHaveBeenCalled()
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'order_shipped' }),
    )
  })

  it('gera etiqueta automaticamente na Melhor Envio quando não há dados manuais', async () => {
    const { orders, shipments, shipping, useCase } = makeSut()
    orders.findById.mockResolvedValue(makePaidOrder(1))
    shipping.createShipment.mockResolvedValue({
      orderId: 'me-auto',
      protocol: 'P-auto',
    })
    shipping.printLabel.mockResolvedValue('https://label/auto')

    const result = await useCase.execute({
      orderId: 'ord-1',
      actorId: 'admin-1',
    })

    expect(shipping.createShipment).toHaveBeenCalledWith(
      expect.objectContaining({
        service: 1,
        from: origin,
        to: expect.objectContaining({ postalCode: '01310100' }),
        products: [expect.objectContaining({ quantity: 1 })],
      }),
    )
    expect(shipping.payShipment).toHaveBeenCalledWith(['me-auto'])
    expect(shipping.generateLabel).toHaveBeenCalledWith(['me-auto'])
    expect(shipping.printLabel).toHaveBeenCalledWith('private', ['me-auto'])

    expect(result.status).toBe('SHIPPED')
    expect(result.labelUrl).toBe('https://label/auto')
    expect(shipments.save).toHaveBeenCalled()
    const shipment = shipments.save.mock.calls[0][0] as {
      meOrderId: string
      protocol: string
      serviceId: number
      labelUrl: string
      status: string
    }
    expect(shipment.meOrderId).toBe('me-auto')
    expect(shipment.protocol).toBe('P-auto')
    expect(shipment.serviceId).toBe(1)
    expect(shipment.labelUrl).toBe('https://label/auto')
    expect(shipment.status).toBe('POSTED')
  })

  it('lança OrderFreightError no fluxo automático quando o pedido não tem serviço de frete', async () => {
    const { orders, useCase } = makeSut()
    orders.findById.mockResolvedValue(makePaidOrder())

    await expect(
      useCase.execute({ orderId: 'ord-1', actorId: 'admin-1' }),
    ).rejects.toThrow(OrderFreightError)
  })

  it('envia o CPF do destinatário do input quando o pedido não o tem', async () => {
    const { orders, shipping, useCase } = makeSut()
    orders.findById.mockResolvedValue(makePaidOrder(1))
    shipping.createShipment.mockResolvedValue({
      orderId: 'me-auto',
      protocol: 'P-auto',
    })
    shipping.printLabel.mockResolvedValue('https://label/auto')

    await useCase.execute({
      orderId: 'ord-1',
      actorId: 'admin-1',
      document: '05596752088',
    })

    expect(shipping.createShipment).toHaveBeenCalledWith(
      expect.objectContaining({
        to: expect.objectContaining({ document: '05596752088' }),
      }),
    )
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
      freightServiceId: 1,
    })
    orders.findById.mockResolvedValue(pending)

    await expect(
      useCase.execute({ orderId: 'ord-1', actorId: 'admin-1' }),
    ).rejects.toThrow(OrderNotPaidError)
  })
})
