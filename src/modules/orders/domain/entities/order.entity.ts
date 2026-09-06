import { DomainError } from '../../../../common/errors/domain-error'
import { Price } from '../../../../common/value-objects/price.vo'
import type { PaymentMethod } from '../../../../common/value-objects/payment-method.vo'
import type { OrderStatus } from '../value-objects/order-status.vo'
import type { ShipTo } from '../value-objects/ship-to.vo'

export class InvalidOrderStatusTransitionError extends DomainError {
  constructor(from: OrderStatus, to: OrderStatus) {
    super(`Transição inválida de status do pedido: ${from} → ${to}`, 400)
  }
}

export class InvalidOrderError extends DomainError {
  constructor(message: string) {
    super(message, 400)
  }
}

export interface CreateOrderProps {
  id: string
  buyerId: string
  productId: string
  unitPrice: Price
  quantity?: number
  freightPrice?: Price
  paymentMethod: PaymentMethod
  shipTo: ShipTo
  freightServiceId?: number | null
  paymentId?: string | null
}

export interface ReconstructOrderProps {
  id: string
  buyerId: string
  productId: string
  unitPrice: Price
  quantity: number
  freightPrice: Price
  status: OrderStatus
  paymentId: string | null
  paymentMethod: PaymentMethod
  shipTo: ShipTo
  freightServiceId: number | null
  paidAt: Date | null
  shippedAt: Date | null
  deliveredAt: Date | null
  cancelledAt: Date | null
  refundedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Transições válidas de estado da venda (plano-melhor-envio §8).
 * PENDING → PAID → SHIPPED → DELIVERED; terminais CANCELLED (só de PENDING)
 * e REFUNDED (de PAID ou SHIPPED — estorno/retorno).
 */
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['PAID', 'CANCELLED'],
  PAID: ['SHIPPED', 'REFUNDED'],
  SHIPPED: ['DELIVERED', 'REFUNDED'],
  DELIVERED: [],
  CANCELLED: [],
  REFUNDED: [],
}

/**
 * Agregado `Order` — a venda de um produto (pingente).
 * Desacoplado de `NfcTag`: nenhuma transição aqui toca a ativação do pingente.
 */
export class Order {
  private constructor(
    private readonly _id: string,
    private readonly _buyerId: string,
    private readonly _productId: string,
    private readonly _unitPrice: Price,
    private readonly _quantity: number,
    private readonly _freightPrice: Price,
    private _status: OrderStatus,
    private _paymentId: string | null,
    private readonly _paymentMethod: PaymentMethod,
    private readonly _shipTo: ShipTo,
    private _freightServiceId: number | null,
    private _paidAt: Date | null,
    private _shippedAt: Date | null,
    private _deliveredAt: Date | null,
    private _cancelledAt: Date | null,
    private _refundedAt: Date | null,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static create(props: CreateOrderProps): Order {
    const quantity = props.quantity ?? 1
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new InvalidOrderError('Quantidade deve ser um inteiro >= 1')
    }
    const freightServiceId = props.freightServiceId ?? null
    if (
      freightServiceId !== null &&
      (!Number.isInteger(freightServiceId) || freightServiceId < 1)
    ) {
      throw new InvalidOrderError('freightServiceId inválido')
    }
    const now = new Date()
    return new Order(
      props.id,
      props.buyerId,
      props.productId,
      props.unitPrice,
      quantity,
      props.freightPrice ?? Price.zero(),
      'PENDING',
      props.paymentId ?? null,
      props.paymentMethod,
      props.shipTo,
      freightServiceId,
      null,
      null,
      null,
      null,
      null,
      now,
      now,
    )
  }

  static reconstitute(props: ReconstructOrderProps): Order {
    return new Order(
      props.id,
      props.buyerId,
      props.productId,
      props.unitPrice,
      props.quantity,
      props.freightPrice,
      props.status,
      props.paymentId,
      props.paymentMethod,
      props.shipTo,
      props.freightServiceId,
      props.paidAt,
      props.shippedAt,
      props.deliveredAt,
      props.cancelledAt,
      props.refundedAt,
      props.createdAt,
      props.updatedAt,
    )
  }

  /** Associa o id do pagamento (MP) ao pedido, sem mudar o status. */
  attachPayment(paymentId: string): void {
    this._paymentId = paymentId
    this.touch()
  }

  /** PENDING → PAID (webhook MP aprovou). */
  markPaid(): void {
    this.transitionTo('PAID')
    this._paidAt = new Date()
  }

  /** PAID → SHIPPED (admin gerou a etiqueta/postagem). */
  markShipped(): void {
    this.transitionTo('SHIPPED')
    this._shippedAt = new Date()
  }

  /** SHIPPED → DELIVERED (webhook ME ou ajuste manual do admin). */
  markDelivered(): void {
    this.transitionTo('DELIVERED')
    this._deliveredAt = new Date()
  }

  /** PENDING → CANCELLED (cancelamento antes do pagamento). */
  cancel(): void {
    this.transitionTo('CANCELLED')
    this._cancelledAt = new Date()
  }

  /** PAID|SHIPPED → REFUNDED (estorno). */
  refund(): void {
    this.transitionTo('REFUNDED')
    this._refundedAt = new Date()
  }

  private transitionTo(to: OrderStatus): void {
    const allowed = VALID_TRANSITIONS[this._status] ?? []
    if (!allowed.includes(to)) {
      throw new InvalidOrderStatusTransitionError(this._status, to)
    }
    this._status = to
    this.touch()
  }

  private touch(): void {
    this._updatedAt = new Date()
  }

  get totalPrice(): Price {
    return Price.create(
      this._unitPrice.amountInCents * this._quantity +
        this._freightPrice.amountInCents,
    )
  }

  get id(): string {
    return this._id
  }
  get buyerId(): string {
    return this._buyerId
  }
  get productId(): string {
    return this._productId
  }
  get unitPrice(): Price {
    return this._unitPrice
  }
  get quantity(): number {
    return this._quantity
  }
  get freightPrice(): Price {
    return this._freightPrice
  }
  get status(): OrderStatus {
    return this._status
  }
  get paymentId(): string | null {
    return this._paymentId
  }
  get paymentMethod(): PaymentMethod {
    return this._paymentMethod
  }
  get shipTo(): ShipTo {
    return this._shipTo
  }
  get freightServiceId(): number | null {
    return this._freightServiceId
  }
  get paidAt(): Date | null {
    return this._paidAt
  }
  get shippedAt(): Date | null {
    return this._shippedAt
  }
  get deliveredAt(): Date | null {
    return this._deliveredAt
  }
  get cancelledAt(): Date | null {
    return this._cancelledAt
  }
  get refundedAt(): Date | null {
    return this._refundedAt
  }
  get createdAt(): Date {
    return this._createdAt
  }
  get updatedAt(): Date {
    return this._updatedAt
  }
}
