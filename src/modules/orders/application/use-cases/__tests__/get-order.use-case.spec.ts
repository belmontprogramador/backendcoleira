import { Price } from '../../../../../common/value-objects/price.vo'
import { ShipTo } from '../../../domain/value-objects/ship-to.vo'
import { Order } from '../../../domain/entities/order.entity'
import { OrderNotFoundError } from '../../errors'
import { GetOrderUseCase } from '../get-order.use-case'

const shipTo = ShipTo.create({
  postalCode: '01310-100',
  street: 'Av. Paulista',
  number: '1000',
  city: 'São Paulo',
  state: 'SP',
  name: 'Fulano',
  phone: '11999999999',
})

function makeOrder(buyerId = 'u1'): Order {
  return Order.create({
    id: 'ord-1',
    buyerId,
    productId: 'p1',
    unitPrice: Price.create(1990),
    paymentMethod: 'PIX',
    shipTo,
  })
}

describe('GetOrderUseCase', () => {
  it('retorna o pedido do próprio dono', async () => {
    const orders = { findById: jest.fn().mockResolvedValue(makeOrder('u1')) }
    const useCase = new GetOrderUseCase(orders as never)

    const result = await useCase.execute({ orderId: 'ord-1', viewerId: 'u1' })

    expect(result.id).toBe('ord-1')
    expect(orders.findById).toHaveBeenCalledWith('ord-1')
  })

  it('não vaza pedido de outro usuário (404)', async () => {
    const orders = { findById: jest.fn().mockResolvedValue(makeOrder('u2')) }
    const useCase = new GetOrderUseCase(orders as never)

    await expect(
      useCase.execute({ orderId: 'ord-1', viewerId: 'u1' }),
    ).rejects.toThrow(OrderNotFoundError)
  })

  it('lança OrderNotFoundError se não existe', async () => {
    const orders = { findById: jest.fn().mockResolvedValue(null) }
    const useCase = new GetOrderUseCase(orders as never)

    await expect(
      useCase.execute({ orderId: 'x', viewerId: 'u1' }),
    ).rejects.toThrow(OrderNotFoundError)
  })
})
