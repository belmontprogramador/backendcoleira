import type { Price } from '../../../../common/value-objects/price.vo'
import type { PaymentProvider } from '../value-objects/payment-provider.vo'
import type { PaymentMethod } from '../value-objects/payment-method.vo'
import type { PaymentStatus } from '../value-objects/payment-status.vo'

export interface CreatePaymentTransactionProps {
  id: string
  userId: string
  planId?: string | null
  subscriptionId?: string | null
  provider: PaymentProvider
  providerPaymentId: string
  paymentMethod: PaymentMethod
  amount: Price
  status?: PaymentStatus
}

export interface ReconstructPaymentTransactionProps {
  id: string
  userId: string
  planId: string | null
  subscriptionId: string | null
  provider: PaymentProvider
  providerPaymentId: string
  paymentMethod: PaymentMethod
  amount: Price
  status: PaymentStatus
  createdAt: Date
  updatedAt: Date
}

/**
 * Entidade `PaymentTransaction` — reconciliação financeira (D4). Nasce
 * `PENDING` no checkout e muda de estado conforme o webhook do gateway.
 */
export class PaymentTransaction {
  private constructor(
    private readonly _id: string,
    private readonly _userId: string,
    private readonly _planId: string | null,
    private _subscriptionId: string | null,
    private readonly _provider: PaymentProvider,
    private readonly _providerPaymentId: string,
    private readonly _paymentMethod: PaymentMethod,
    private readonly _amount: Price,
    private _status: PaymentStatus,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static create(props: CreatePaymentTransactionProps): PaymentTransaction {
    const now = new Date()
    return new PaymentTransaction(
      props.id,
      props.userId,
      props.planId ?? null,
      props.subscriptionId ?? null,
      props.provider,
      props.providerPaymentId,
      props.paymentMethod,
      props.amount,
      props.status ?? 'PENDING',
      now,
      now,
    )
  }

  static reconstitute(
    props: ReconstructPaymentTransactionProps,
  ): PaymentTransaction {
    return new PaymentTransaction(
      props.id,
      props.userId,
      props.planId,
      props.subscriptionId,
      props.provider,
      props.providerPaymentId,
      props.paymentMethod,
      props.amount,
      props.status,
      props.createdAt,
      props.updatedAt,
    )
  }

  markApproved(): void {
    this._status = 'APPROVED'
    this.touch()
  }

  markRejected(): void {
    this._status = 'REJECTED'
    this.touch()
  }

  markRefunded(): void {
    this._status = 'REFUNDED'
    this.touch()
  }

  linkSubscription(subscriptionId: string): void {
    this._subscriptionId = subscriptionId
    this.touch()
  }

  private touch(): void {
    this._updatedAt = new Date()
  }

  get id(): string {
    return this._id
  }
  get userId(): string {
    return this._userId
  }
  get planId(): string | null {
    return this._planId
  }
  get subscriptionId(): string | null {
    return this._subscriptionId
  }
  get provider(): PaymentProvider {
    return this._provider
  }
  get providerPaymentId(): string {
    return this._providerPaymentId
  }
  get paymentMethod(): PaymentMethod {
    return this._paymentMethod
  }
  get amount(): Price {
    return this._amount
  }
  get status(): PaymentStatus {
    return this._status
  }
  get createdAt(): Date {
    return this._createdAt
  }
  get updatedAt(): Date {
    return this._updatedAt
  }
}
