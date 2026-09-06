import { OrdersController } from '../orders.controller'
import { Price } from '../../../../../common/value-objects/price.vo'
import { ShipTo } from '../../../domain/value-objects/ship-to.vo'
import { Order } from '../../../domain/entities/order.entity'

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
  return Order.create({
    id: 'ord-1',
    buyerId: 'u1',
    productId: 'p1',
    unitPrice: Price.create(1990),
    paymentMethod: 'PIX',
    shipTo,
    freightServiceId: 1,
  })
}

describe('OrdersController', () => {
  function makeController() {
    const createOrder = { execute: jest.fn() }
    const listMyOrders = { execute: jest.fn() }
    const getOrder = { execute: jest.fn() }
    const trackOrder = { execute: jest.fn() }
    const quoteOrder = { execute: jest.fn() }
    const controller = new OrdersController(
      createOrder as never,
      listMyOrders as never,
      getOrder as never,
      trackOrder as never,
      quoteOrder as never,
    )
    return { controller, createOrder, listMyOrders, getOrder, trackOrder, quoteOrder }
  }

  it('quote delega ao use case com CEP + quantidade', async () => {
    const { controller, quoteOrder } = makeController()
    quoteOrder.execute.mockResolvedValue([{ id: 1, name: 'PAC' }])

    const result = await controller.quote({ postalCode: '01310100', quantity: 1 })

    expect(quoteOrder.execute).toHaveBeenCalledWith({
      postalCode: '01310100',
      quantity: 1,
    })
    expect(result).toEqual([{ id: 1, name: 'PAC' }])
  })

  it('create injeta buyerId/email do token (nunca do body)', async () => {
    const { controller, createOrder } = makeController()
    createOrder.execute.mockResolvedValue({ orderId: 'o1' })

    await controller.create(
      { sub: 'u1', email: 'a@b.com' } as never,
      {
        productId: 'p1',
        quantity: 1,
        shipTo: {
          postalCode: '01310-100',
          street: 'Av. Paulista',
          number: '1000',
          city: 'São Paulo',
          state: 'SP',
          name: 'Fulano',
          phone: '11999999999',
        },
        freightServiceId: 1,
        paymentMethod: 'PIX',
      } as never,
    )

    expect(createOrder.execute).toHaveBeenCalledWith(
      expect.objectContaining({ buyerId: 'u1', buyerEmail: 'a@b.com' }),
    )
  })

  it('mine monta o envelope com meta', async () => {
    const { controller, listMyOrders } = makeController()
    listMyOrders.execute.mockResolvedValue({
      data: [makeOrder()],
      total: 1,
      page: 1,
      limit: 10,
    })

    const result = await controller.mine(
      { sub: 'u1', email: 'a@b.com' } as never,
      { page: 1, limit: 10 } as never,
    )

    expect(listMyOrders.execute).toHaveBeenCalledWith({
      buyerId: 'u1',
      page: 1,
      limit: 10,
    })
    expect(result.meta).toEqual({ total: 1, page: 1, limit: 10, totalPages: 1 })
    expect(result.data[0].id).toBe('ord-1')
  })

  it('detail retorna o pedido + rastreio', async () => {
    const { controller, getOrder, trackOrder } = makeController()
    getOrder.execute.mockResolvedValue(makeOrder())
    trackOrder.execute.mockResolvedValue({ 'me-1': { status: 'posted' } })

    const result = await controller.detail(
      { sub: 'u1', email: 'a@b.com' } as never,
      'ord-1',
    )

    expect(getOrder.execute).toHaveBeenCalledWith({
      orderId: 'ord-1',
      viewerId: 'u1',
    })
    expect(trackOrder.execute).toHaveBeenCalledWith({ orderId: 'ord-1' })
    expect(result.id).toBe('ord-1')
    expect(result.tracking).toEqual({ 'me-1': { status: 'posted' } })
  })
})
