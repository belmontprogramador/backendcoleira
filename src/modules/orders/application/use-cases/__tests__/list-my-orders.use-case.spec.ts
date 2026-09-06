import { Price } from '../../../../../common/value-objects/price.vo'
import { ShipTo } from '../../../domain/value-objects/ship-to.vo'
import { Order } from '../../../domain/entities/order.entity'
import { ListMyOrdersUseCase } from '../list-my-orders.use-case'

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

describe('ListMyOrdersUseCase', () => {
  it('lista sempre filtrado por buyerId + paginação', async () => {
    const order = makeOrder()
    const orders = {
      list: jest.fn().mockResolvedValue([order]),
      count: jest.fn().mockResolvedValue(1),
    }
    const useCase = new ListMyOrdersUseCase(orders as never)

    const result = await useCase.execute({ buyerId: 'u1', page: 2, limit: 5 })

    expect(orders.list).toHaveBeenCalledWith({
      buyerId: 'u1',
      page: 2,
      limit: 5,
    })
    expect(orders.count).toHaveBeenCalledWith({
      buyerId: 'u1',
      page: 2,
      limit: 5,
    })
    expect(result).toEqual({ data: [order], total: 1, page: 2, limit: 5 })
  })
})
