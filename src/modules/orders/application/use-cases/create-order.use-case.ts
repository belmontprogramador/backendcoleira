import { Inject, Injectable } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { Price } from '../../../../common/value-objects/price.vo'
import type { PaymentMethod } from '../../../../common/value-objects/payment-method.vo'
import type { PaymentStatus } from '../../../../common/value-objects/payment-status.vo'
import {
  PAYMENT_GATEWAY_PORT,
  type PaymentGatewayPort,
} from '../../../../common/ports/payment-gateway.port'
import {
  SHIPPING_GATEWAY_PORT,
  type ShippingGatewayPort,
} from '../../../../common/ports/shipping-gateway.port'
import { SHIPPING_ORIGIN_POSTAL_CODE_PORT } from '../../../../common/ports/shipping-origin.port'
import { AUDIT_LOGGER_PORT, type AuditLoggerPort } from '../../../../common/ports/audit-logger.port'
import {
  PRODUCT_REPOSITORY_PORT,
  type ProductRepositoryPort,
} from '../../../products/domain/repositories/product.repository.port'
import { ProductNotFoundError } from '../../../products/application/errors'
import {
  ORDER_REPOSITORY_PORT,
  type OrderRepositoryPort,
} from '../../domain/repositories/order.repository.port'
import { ShipTo } from '../../domain/value-objects/ship-to.vo'
import { Order } from '../../domain/entities/order.entity'
import { PINGENTE_PACKAGE } from '../../domain/constants/pingente-package'
import { OrderFreightError } from '../errors'

export interface CreateOrderInput {
  buyerId: string
  buyerEmail: string
  productId: string
  quantity: number
  shipTo: {
    postalCode: string
    street: string
    number: string
    city: string
    state: string
    name: string
    phone: string
  }
  freightServiceId: number
  paymentMethod: PaymentMethod
  cardToken?: string
  cardPaymentMethodId?: string
  cardInstallments?: number
  cardIssuerId?: string
  payerIdentificationType?: string
  payerIdentificationNumber?: string
  payerFirstName?: string
  payerLastName?: string
}

export interface CreateOrderResult {
  orderId: string
  providerPaymentId: string
  status: PaymentStatus
  pixQrCode?: string
  pixQrCodeBase64?: string
  boletoUrl?: string
  boletoBarcode?: string
  cardApproved?: boolean
}

/**
 * Cria a venda (PENDING) e dispara o pagamento no gateway.
 *
 * O preço do produto vem do banco (`Product.price`); o frete é re-cotado na
 * hora via `ShippingGatewayPort.calculateQuote` (nunca confia em preço do
 * cliente) e o serviço escolhido (`freightServiceId`) define o valor.
 */
@Injectable()
export class CreateOrderUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY_PORT)
    private readonly products: ProductRepositoryPort,
    @Inject(SHIPPING_GATEWAY_PORT)
    private readonly shipping: ShippingGatewayPort,
    @Inject(PAYMENT_GATEWAY_PORT)
    private readonly payments: PaymentGatewayPort,
    @Inject(ORDER_REPOSITORY_PORT)
    private readonly orders: OrderRepositoryPort,
    @Inject(AUDIT_LOGGER_PORT)
    private readonly audit: AuditLoggerPort,
    @Inject(SHIPPING_ORIGIN_POSTAL_CODE_PORT)
    private readonly originPostalCode: string,
  ) {}

  async execute(input: CreateOrderInput): Promise<CreateOrderResult> {
    const product = await this.products.findById(input.productId)
    if (!product || !product.active) {
      throw new ProductNotFoundError()
    }

    const shipTo = ShipTo.create(input.shipTo)

    const quotes = await this.shipping.calculateQuote({
      fromPostalCode: this.originPostalCode,
      toPostalCode: shipTo.postalCode,
      products: [{ ...PINGENTE_PACKAGE, quantity: input.quantity }],
    })
    const quote = quotes.find(q => q.id === input.freightServiceId)
    if (!quote) {
      throw new OrderFreightError(
        `Serviço de frete ${input.freightServiceId} indisponível`,
      )
    }

    const freightPrice = Price.create(quote.priceCents)

    const order = Order.create({
      id: randomUUID(),
      buyerId: input.buyerId,
      productId: product.id,
      unitPrice: product.price,
      quantity: input.quantity,
      freightPrice,
      paymentMethod: input.paymentMethod,
      shipTo,
      freightServiceId: input.freightServiceId,
    })

    const payment = await this.payments.createPayment({
      amountCents: order.totalPrice.amountInCents,
      method: input.paymentMethod,
      payerEmail: input.buyerEmail,
      description: `Pingente Elopet x${input.quantity}`,
      cardToken: input.cardToken,
      cardPaymentMethodId: input.cardPaymentMethodId,
      cardInstallments: input.cardInstallments,
      cardIssuerId: input.cardIssuerId,
      payerIdentificationType: input.payerIdentificationType,
      payerIdentificationNumber: input.payerIdentificationNumber,
      payerFirstName: input.payerFirstName,
      payerLastName: input.payerLastName,
    })

    order.attachPayment(payment.providerPaymentId)
    await this.orders.save(order)

    await this.audit.log({
      userId: input.buyerId,
      action: 'order_created',
      entity: 'Order',
      entityId: order.id,
      metadata: {
        amountCents: order.totalPrice.amountInCents,
        method: input.paymentMethod,
      },
    })

    return {
      orderId: order.id,
      providerPaymentId: payment.providerPaymentId,
      status: payment.status,
      pixQrCode: payment.pixQrCode,
      pixQrCodeBase64: payment.pixQrCodeBase64,
      boletoUrl: payment.boletoUrl,
      boletoBarcode: payment.boletoBarcode,
      cardApproved: payment.cardApproved,
    }
  }
}
