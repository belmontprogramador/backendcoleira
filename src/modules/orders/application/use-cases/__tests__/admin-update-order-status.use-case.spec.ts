import { Price } from '../../../../../common/value-objects/price.vo'
import { ShipTo } from '../../../domain/value-objects/ship-to.vo'
import { Order } from '../../../domain/entities/order.entity'
import { OrderNotFoundError, OrderStatusConflictError } from '../../errors'
import { AdminUpdateOrderStatusUseCase } from '../admin-update-order-status.use-case'

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

describe('AdminUpdateOrderStatusUseCase', () => {
  it('marca DELIVERED a partir de SHIPPED e audita', async () => {
    const order = makeShippedOrder()
    const orders = {
      findById: jest.fn().mockResolvedValue(order),
      save: jest.fn().mockImplementation(async (o: Order) => o),
    }
    const audit = { log: jest.fn().mockResolvedValue(undefined) }
    const useCase = new AdminUpdateOrderStatusUseCase(
      orders as never,
      audit as never,
    )

    const result = await useCase.execute({
      orderId: 'ord-1',
      actorId: 'admin-1',
      status: 'DELIVERED',
    })

    expect(result.status).toBe('DELIVERED')
    expect(orders.save).toHaveBeenCalled()
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'order_status_changed',
        metadata: { from: 'SHIPPED', to: 'DELIVERED' },
      }),
    )
  })

  it('lança 409 para transição inválida (DELIVERED em PENDING)', async () => {
    const order = Order.create({
      id: 'ord-1',
      buyerId: 'u1',
      productId: 'p1',
      unitPrice: Price.create(1990),
      paymentMethod: 'PIX',
      shipTo,
    })
    const orders = { findById: jest.fn().mockResolvedValue(order) }
    const audit = { log: jest.fn().mockResolvedValue(undefined) }
    const useCase = new AdminUpdateOrderStatusUseCase(
      orders as never,
      audit as never,
    )

    await expect(
      useCase.execute({ orderId: 'ord-1', actorId: 'admin-1', status: 'DELIVERED' }),
    ).rejects.toThrow(OrderStatusConflictError)
  })

  it('lança 404 quando o pedido não existe', async () => {
    const orders = { findById: jest.fn().mockResolvedValue(null) }
    const audit = { log: jest.fn().mockResolvedValue(undefined) }
    const useCase = new AdminUpdateOrderStatusUseCase(
      orders as never,
      audit as never,
    )

    await expect(
      useCase.execute({ orderId: 'x', actorId: 'admin-1', status: 'DELIVERED' }),
    ).rejects.toThrow(OrderNotFoundError)
  })
})
