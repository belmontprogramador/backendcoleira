import type { SubscriptionStatus } from '../value-objects/subscription-status.vo'
import type { PaymentProvider } from '../value-objects/payment-provider.vo'
import type { SubscriptionPeriod } from '../value-objects/subscription-period.vo'

export interface CreateSubscriptionProps {
  id: string
  userId: string
  planId: string
  provider?: PaymentProvider
  providerCustomerId?: string | null
  providerSubscriptionId?: string | null
  status?: SubscriptionStatus
  period: SubscriptionPeriod
  startedAt?: Date
}

export interface ReconstructSubscriptionProps {
  id: string
  userId: string
  planId: string
  provider: PaymentProvider
  providerCustomerId: string | null
  providerSubscriptionId: string | null
  status: SubscriptionStatus
  startedAt: Date
  currentPeriodStart: Date
  currentPeriodEnd: Date
  cancelledAt: Date | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Entidade `Subscription` — dona do ciclo de assinatura (modelo B: recorrência
 * nossa, não do gateway). Expiração é lazy (D8): `ACTIVE → EXPIRED` na consulta.
 */
export class Subscription {
  private constructor(
    private readonly _id: string,
    private readonly _userId: string,
    private readonly _planId: string,
    private readonly _provider: PaymentProvider,
    private readonly _providerCustomerId: string | null,
    private readonly _providerSubscriptionId: string | null,
    private _status: SubscriptionStatus,
    private readonly _startedAt: Date,
    private _currentPeriodStart: Date,
    private _currentPeriodEnd: Date,
    private _cancelledAt: Date | null,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static create(props: CreateSubscriptionProps): Subscription {
    const now = new Date()
    return new Subscription(
      props.id,
      props.userId,
      props.planId,
      props.provider ?? 'MERCADO_PAGO',
      props.providerCustomerId ?? null,
      props.providerSubscriptionId ?? null,
      props.status ?? 'ACTIVE',
      props.startedAt ?? now,
      props.period.start,
      props.period.end,
      null,
      now,
      now,
    )
  }

  static reconstitute(props: ReconstructSubscriptionProps): Subscription {
    return new Subscription(
      props.id,
      props.userId,
      props.planId,
      props.provider,
      props.providerCustomerId,
      props.providerSubscriptionId,
      props.status,
      props.startedAt,
      props.currentPeriodStart,
      props.currentPeriodEnd,
      props.cancelledAt,
      props.createdAt,
      props.updatedAt,
    )
  }

  /** Idempotente: preserva o `cancelledAt` da primeira chamada. */
  cancel(): void {
    if (this._status === 'CANCELLED') {
      return
    }
    this._status = 'CANCELLED'
    this._cancelledAt = new Date()
    this.touch()
  }

  /** D8 — expiração lazy: só transiciona `ACTIVE → EXPIRED` se o período venceu. */
  expireIfDue(now: Date): void {
    if (
      this._status === 'ACTIVE' &&
      this._currentPeriodEnd.getTime() < now.getTime()
    ) {
      this._status = 'EXPIRED'
      this.touch()
    }
  }

  /** Renovação (novo checkout aprovado): estende o período e reativa. */
  renew(period: SubscriptionPeriod): void {
    this._currentPeriodStart = period.start
    this._currentPeriodEnd = period.end
    this._status = 'ACTIVE'
    this._cancelledAt = null
    this.touch()
  }

  /** Assinatura com benefício Premium: `ACTIVE`/`TRIALING` dentro do período. */
  isActive(now: Date): boolean {
    return (
      (this._status === 'ACTIVE' || this._status === 'TRIALING') &&
      this._currentPeriodEnd.getTime() >= now.getTime()
    )
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
  get planId(): string {
    return this._planId
  }
  get provider(): PaymentProvider {
    return this._provider
  }
  get providerCustomerId(): string | null {
    return this._providerCustomerId
  }
  get providerSubscriptionId(): string | null {
    return this._providerSubscriptionId
  }
  get status(): SubscriptionStatus {
    return this._status
  }
  get startedAt(): Date {
    return this._startedAt
  }
  get currentPeriodStart(): Date {
    return this._currentPeriodStart
  }
  get currentPeriodEnd(): Date {
    return this._currentPeriodEnd
  }
  get cancelledAt(): Date | null {
    return this._cancelledAt
  }
  get createdAt(): Date {
    return this._createdAt
  }
  get updatedAt(): Date {
    return this._updatedAt
  }
}
