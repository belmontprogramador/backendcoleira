import { Price } from '../../../../../common/value-objects/price.vo'
import { ShipTo } from '../../../domain/value-objects/ship-to.vo'
import { Order } from '../../../domain/entities/order.entity'
import { OrderNotFoundError } from '../../errors'
import { AdminGetOrderUseCase } from '../admin-get-order.use-case'

const shipTo = ShipTo.create({
  postalCode: '01310-100',
  street: 'Av. Paulista',
  number: '1000',
  city: 'São Paulo',
  state: 'SP',
  name: 'Fulano',
  phone: '11999999999',
})

describe('AdminGetOrderUseCase', () => {
  it('retorna o pedido sem checar ownership', async () => {
    const order = Order.create({
      id: 'ord-1',
      buyerId: 'u1',
      productId: 'p1',
      unitPrice: Price.create(1990),
      paymentMethod: 'PIX',
      shipTo,
    })
    const orders = { findById: jest.fn().mockResolvedValue(order) }
    const useCase = new AdminGetOrderUseCase(orders as never)

    const result = await useCase.execute({ orderId: 'ord-1' })

    expect(result.id).toBe('ord-1')
    expect(orders.findById).toHaveBeenCalledWith('ord-1')
  })

  it('lança 404 quando o pedido não existe', async () => {
    const orders = { findById: jest.fn().mockResolvedValue(null) }
    const useCase = new AdminGetOrderUseCase(orders as never)

    await expect(useCase.execute({ orderId: 'x' })).rejects.toThrow(
      OrderNotFoundError,
    )
  })
})
