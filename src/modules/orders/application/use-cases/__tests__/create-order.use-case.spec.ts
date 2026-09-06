import { Price } from '../../../../../common/value-objects/price.vo'
import { Product } from '../../../../products/domain/entities/product.entity'
import { ProductNotFoundError } from '../../../../products/application/errors'
import { Order } from '../../../domain/entities/order.entity'
import { OrderFreightError } from '../../errors'
import { CreateOrderUseCase } from '../create-order.use-case'

const product = Product.create({
  id: 'p1',
  sku: 'pingente',
  name: 'Pingente Elopet',
  price: Price.create(1990),
})

const quote = {
  id: 1,
  name: 'PAC',
  priceCents: 1860,
  customPriceCents: 1860,
  discountCents: 0,
  currency: 'R$',
  deliveryTime: 6,
  customDeliveryTime: 6,
  company: { id: 1, name: 'Correios', picture: '' },
}

const input = {
  buyerId: 'u1',
  buyerEmail: 'a@b.c',
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
  paymentMethod: 'PIX' as const,
}

function makeSut() {
  const products = { findById: jest.fn().mockResolvedValue(product) }
  const shipping = { calculateQuote: jest.fn().mockResolvedValue([quote]) }
  const payments = {
    createPayment: jest.fn().mockResolvedValue({
      providerPaymentId: 'mp-1',
      status: 'PENDING',
      pixQrCode: 'qr',
      pixQrCodeBase64: 'qr64',
    }),
  }
  const orders = { save: jest.fn().mockImplementation(async (o: Order) => o) }
  const audit = { log: jest.fn().mockResolvedValue(undefined) }

  const useCase = new CreateOrderUseCase(
    products as never,
    shipping as never,
    payments as never,
    orders as never,
    audit as never,
    '01310100',
  )

  return { products, shipping, payments, orders, audit, useCase }
}

describe('CreateOrderUseCase', () => {
  it('cria a venda + pagamento e retorna os dados de pagamento', async () => {
    const { products, shipping, payments, orders, useCase } = makeSut()

    const result = await useCase.execute(input)

    expect(result.orderId).toBeDefined()
    expect(result.providerPaymentId).toBe('mp-1')
    expect(result.status).toBe('PENDING')
    expect(result.pixQrCode).toBe('qr')

    expect(products.findById).toHaveBeenCalledWith('p1')
    expect(shipping.calculateQuote).toHaveBeenCalledWith({
      fromPostalCode: '01310100',
      toPostalCode: '01310100',
      products: [expect.objectContaining({ id: 'pingente', quantity: 1 })],
    })
    expect(payments.createPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        amountCents: 1990 + 1860,
        method: 'PIX',
        payerEmail: 'a@b.c',
      }),
    )

    const savedOrder = orders.save.mock.calls[0][0] as Order
    expect(savedOrder.status).toBe('PENDING')
    expect(savedOrder.paymentId).toBe('mp-1')
    expect(savedOrder.totalPrice.amountInCents).toBe(1990 + 1860)
  })

  it('usa priceCents quando customPriceCents está ausente', async () => {
    const { shipping, orders, useCase } = makeSut()
    shipping.calculateQuote.mockResolvedValue([
      { ...quote, customPriceCents: undefined as unknown as number },
    ])

    await useCase.execute(input)

    const savedOrder = orders.save.mock.calls[0][0] as Order
    expect(savedOrder.totalPrice.amountInCents).toBe(1990 + 1860)
  })

  it('lança ProductNotFoundError se o produto não existe', async () => {
    const { products, useCase } = makeSut()
    products.findById.mockResolvedValue(null)

    await expect(useCase.execute(input)).rejects.toThrow(ProductNotFoundError)
  })

  it('lança ProductNotFoundError se o produto está inativo', async () => {
    const { products, useCase } = makeSut()
    products.findById.mockResolvedValue(
      Product.reconstitute({
        id: 'p1',
        sku: 'pingente',
        name: 'Pingente Elopet',
        description: null,
        price: Price.create(1990),
        active: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    )

    await expect(useCase.execute(input)).rejects.toThrow(ProductNotFoundError)
  })

  it('lança OrderFreightError se o serviço de frete não está na cotação', async () => {
    const { shipping, useCase } = makeSut()
    shipping.calculateQuote.mockResolvedValue([])

    await expect(useCase.execute(input)).rejects.toThrow(OrderFreightError)
  })

  it('repassa os campos de cartão ao gateway', async () => {
    const { payments, useCase } = makeSut()

    await useCase.execute({
      ...input,
      paymentMethod: 'CARD',
      cardToken: 'tok',
      cardPaymentMethodId: 'visa',
      cardInstallments: 3,
      cardIssuerId: '25',
      payerIdentificationType: 'CPF',
      payerIdentificationNumber: '11144477735',
      payerFirstName: 'Fulano',
      payerLastName: 'de Tal',
    })

    expect(payments.createPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'CARD',
        cardToken: 'tok',
        cardPaymentMethodId: 'visa',
        cardInstallments: 3,
        cardIssuerId: '25',
        payerIdentificationNumber: '11144477735',
      }),
    )
  })

  it('registra auditoria order_created', async () => {
    const { audit, useCase } = makeSut()

    await useCase.execute(input)

    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        action: 'order_created',
        entity: 'Order',
      }),
    )
  })
})
