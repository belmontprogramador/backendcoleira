import { DomainError } from '../../../../common/errors/domain-error'
import type { CommissionStatus } from '../value-objects/commission-status.vo'
import type { CommissionSource } from '../value-objects/commission-source.vo'
import type {
  CommissionConfig,
  CommissionType,
} from '../value-objects/commission-config.vo'

export class InvalidCommissionError extends DomainError {
  constructor(message: string) {
    super(message, 400)
  }
}

export interface CreateCommissionProps {
  id: string
  affiliateId: string
  source: CommissionSource
  orderId?: string | null
  subscriptionId?: string | null
  /** Base de cálculo em centavos (valor do produto sem frete, ou preço do plano). */
  baseAmountCents: number
  /** Snapshot da config do afiliado no momento da atribuição. */
  commission: CommissionConfig
}

export interface ReconstructCommissionProps {
  id: string
  affiliateId: string
  source: CommissionSource
  orderId: string | null
  subscriptionId: string | null
  baseAmountCents: number
  commissionType: CommissionType
  fixedCents: number
  percentBps: number
  amountCents: number
  status: CommissionStatus
  createdAt: Date
  updatedAt: Date
}

/**
 * Entidade `Commission` — uma comissão devida a um afiliado por uma venda de
 * pingente paga ou por um ciclo de assinatura pago.
 *
 * A config (`commissionType`/`fixedCents`/`percentBps`) é um snapshot do
 * momento da atribuição; o `amountCents` é calculado no `create`.
 */
export class Commission {
  private constructor(
    private readonly _id: string,
    private readonly _affiliateId: string,
    private readonly _source: CommissionSource,
    private readonly _orderId: string | null,
    private readonly _subscriptionId: string | null,
    private readonly _baseAmountCents: number,
    private readonly _commissionType: CommissionType,
    private readonly _fixedCents: number,
    private readonly _percentBps: number,
    private readonly _amountCents: number,
    private _status: CommissionStatus,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static create(props: CreateCommissionProps): Commission {
    if (props.source === 'ORDER' && !props.orderId) {
      throw new InvalidCommissionError(
        'Comissão de venda exige orderId',
      )
    }
    if (props.source === 'SUBSCRIPTION' && !props.subscriptionId) {
      throw new InvalidCommissionError(
        'Comissão de assinatura exige subscriptionId',
      )
    }

    const amountCents = props.commission.calculate(props.baseAmountCents)
    const now = new Date()
    return new Commission(
      props.id,
      props.affiliateId,
      props.source,
      props.orderId ?? null,
      props.subscriptionId ?? null,
      props.baseAmountCents,
      props.commission.type,
      props.commission.fixedCents,
      props.commission.percentBps,
      amountCents,
      'AVAILABLE',
      now,
      now,
    )
  }

  static reconstitute(props: ReconstructCommissionProps): Commission {
    return new Commission(
      props.id,
      props.affiliateId,
      props.source,
      props.orderId,
      props.subscriptionId,
      props.baseAmountCents,
      props.commissionType,
      props.fixedCents,
      props.percentBps,
      props.amountCents,
      props.status,
      props.createdAt,
      props.updatedAt,
    )
  }

  /** Estorno (venda reembolsada/cancelada antes do saque). Idempotente. */
  cancel(): void {
    if (this._status === 'CANCELLED') {
      return
    }
    this._status = 'CANCELLED'
    this._updatedAt = new Date()
  }

  isAvailable(): boolean {
    return this._status === 'AVAILABLE'
  }

  get id(): string {
    return this._id
  }
  get affiliateId(): string {
    return this._affiliateId
  }
  get source(): CommissionSource {
    return this._source
  }
  get orderId(): string | null {
    return this._orderId
  }
  get subscriptionId(): string | null {
    return this._subscriptionId
  }
  get baseAmountCents(): number {
    return this._baseAmountCents
  }
  get commissionType(): CommissionType {
    return this._commissionType
  }
  get fixedCents(): number {
    return this._fixedCents
  }
  get percentBps(): number {
    return this._percentBps
  }
  get amountCents(): number {
    return this._amountCents
  }
  get status(): CommissionStatus {
    return this._status
  }
  get createdAt(): Date {
    return this._createdAt
  }
  get updatedAt(): Date {
    return this._updatedAt
  }
}
