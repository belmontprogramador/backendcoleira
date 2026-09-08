import { Price } from '../../../../../common/value-objects/price.vo'
import { ShipTo } from '../../../domain/value-objects/ship-to.vo'
import { Order } from '../../../domain/entities/order.entity'
import { PayOrderWebhookUseCase } from '../pay-order-webhook.use-case'

const shipTo = ShipTo.create({
  postalCode: '01310-100',
  street: 'Av. Paulista',
  number: '1000',
  city: 'São Paulo',
  state: 'SP',
  name: 'Fulano',
  phone: '11999999999',
})

function makeOrder(status: 'PENDING' | 'PAID' | 'SHIPPED'): Order {
  const order = Order.create({
    id: 'ord-1',
    buyerId: 'u1',
    productId: 'p1',
    unitPrice: Price.create(1990),
    paymentMethod: 'PIX',
    shipTo,
  })
  order.attachPayment('mp-1')
  if (status === 'PAID') order.markPaid()
  if (status === 'SHIPPED') {
    order.markPaid()
    order.markShipped()
  }
  return order
}

function makeSut() {
  const payments = { getPayment: jest.fn() }
  const orders = {
    findByPaymentId: jest.fn(),
    save: jest.fn().mockImplementation(async (o: Order) => o),
  }
  const audit = { log: jest.fn().mockResolvedValue(undefined) }
  const affiliateCommission = {
    attributeOrder: jest.fn().mockResolvedValue(undefined),
    attributeSubscription: jest.fn().mockResolvedValue(undefined),
    revokeOrder: jest.fn().mockResolvedValue(undefined),
    revokeSubscription: jest.fn().mockResolvedValue(undefined),
  }

  const useCase = new PayOrderWebhookUseCase(
    payments as never,
    orders as never,
    audit as never,
    affiliateCommission as never,
  )

  return { payments, orders, audit, affiliateCommission, useCase }
}

describe('PayOrderWebhookUseCase', () => {
  it('APPROVED → markPaid (PENDING → PAID)', async () => {
    const { payments, orders, audit, useCase } = makeSut()
    payments.getPayment.mockResolvedValue({ status: 'APPROVED' })
    orders.findByPaymentId.mockResolvedValue(makeOrder('PENDING'))

    const result = await useCase.execute({ paymentId: 'mp-1' })

    expect(result).toEqual({
      processed: true,
      orderId: 'ord-1',
      orderStatus: 'PAID',
    })
    expect(orders.save).toHaveBeenCalled()
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'order_paid' }),
    )
  })

  it('REJECTED → cancel (PENDING → CANCELLED)', async () => {
    const { payments, orders, useCase } = makeSut()
    payments.getPayment.mockResolvedValue({ status: 'REJECTED' })
    orders.findByPaymentId.mockResolvedValue(makeOrder('PENDING'))

    const result = await useCase.execute({ paymentId: 'mp-1' })

    expect(result.orderStatus).toBe('CANCELLED')
    expect(result.processed).toBe(true)
  })

  it('REFUNDED → refund (PAID → REFUNDED)', async () => {
    const { payments, orders, useCase } = makeSut()
    payments.getPayment.mockResolvedValue({ status: 'REFUNDED' })
    orders.findByPaymentId.mockResolvedValue(makeOrder('PAID'))

    const result = await useCase.execute({ paymentId: 'mp-1' })

    expect(result.orderStatus).toBe('REFUNDED')
  })

  it('não processa pedido desconhecido (paymentId sem order)', async () => {
    const { payments, orders, useCase } = makeSut()
    payments.getPayment.mockResolvedValue({ status: 'APPROVED' })
    orders.findByPaymentId.mockResolvedValue(null)

    const result = await useCase.execute({ paymentId: 'mp-x' })

    expect(result.processed).toBe(false)
    expect(orders.save).not.toHaveBeenCalled()
  })

  it('é idempotente: APPROVED num pedido já PAID não re-transiciona', async () => {
    const { payments, orders, useCase } = makeSut()
    payments.getPayment.mockResolvedValue({ status: 'APPROVED' })
    orders.findByPaymentId.mockResolvedValue(makeOrder('PAID'))

    const result = await useCase.execute({ paymentId: 'mp-1' })

    expect(result.processed).toBe(false)
    expect(orders.save).not.toHaveBeenCalled()
  })

  it('PENDING (pagamento) não muda nada', async () => {
    const { payments, orders, useCase } = makeSut()
    payments.getPayment.mockResolvedValue({ status: 'PENDING' })
    orders.findByPaymentId.mockResolvedValue(makeOrder('PENDING'))

    const result = await useCase.execute({ paymentId: 'mp-1' })

    expect(result.processed).toBe(false)
  })
})
