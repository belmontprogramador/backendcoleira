import { AdminOrdersController } from '../admin-orders.controller'
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
  })
}

describe('AdminOrdersController', () => {
  function makeController() {
    const listAll = { execute: jest.fn() }
    const getOrder = { execute: jest.fn() }
    const ship = { execute: jest.fn() }
    const updateStatus = { execute: jest.fn() }
    const controller = new AdminOrdersController(
      listAll as never,
      getOrder as never,
      ship as never,
      updateStatus as never,
    )
    return { controller, listAll, getOrder, ship, updateStatus }
  }

  it('list monta o envelope com meta', async () => {
    const { controller, listAll } = makeController()
    listAll.execute.mockResolvedValue({
      data: [makeOrder()],
      total: 1,
      page: 1,
      limit: 10,
    })

    const result = await controller.list({ page: 1, limit: 10 } as never)

    expect(listAll.execute).toHaveBeenCalledWith({ page: 1, limit: 10 })
    expect(result.meta.totalPages).toBe(1)
    expect(result.data[0].id).toBe('ord-1')
  })

  it('detail projeta o pedido', async () => {
    const { controller, getOrder } = makeController()
    getOrder.execute.mockResolvedValue(makeOrder())

    const result = await controller.detail('ord-1')

    expect(getOrder.execute).toHaveBeenCalledWith({ orderId: 'ord-1' })
    expect(result.id).toBe('ord-1')
  })

  it('shipRoute delega com actorId do token', async () => {
    const { controller, ship } = makeController()
    ship.execute.mockResolvedValue({ orderId: 'ord-1', status: 'SHIPPED' })

    await controller.shipRoute(
      { sub: 'admin-1' } as never,
      'ord-1',
      { meOrderId: 'me-1', protocol: 'P1', serviceId: 1 } as never,
    )

    expect(ship.execute).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: 'ord-1', actorId: 'admin-1' }),
    )
  })

  it('patchStatus delega o ajuste manual', async () => {
    const { controller, updateStatus } = makeController()
    updateStatus.execute.mockResolvedValue({ orderId: 'ord-1', status: 'DELIVERED' })

    await controller.patchStatus(
      { sub: 'admin-1' } as never,
      'ord-1',
      { status: 'DELIVERED' } as never,
    )

    expect(updateStatus.execute).toHaveBeenCalledWith({
      orderId: 'ord-1',
      actorId: 'admin-1',
      status: 'DELIVERED',
    })
  })
})
