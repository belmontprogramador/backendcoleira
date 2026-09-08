import { DomainError } from '../../../../common/errors/domain-error'
import {
  WITHDRAWAL_TRANSITIONS,
  type WithdrawalStatus,
} from '../value-objects/withdrawal-status.vo'

export class InvalidWithdrawalError extends DomainError {
  constructor(message: string) {
    super(message, 400)
  }
}

export interface CreateWithdrawalProps {
  id: string
  affiliateId: string
  amountCents: number
  pixKey: string
}

export interface ReconstructWithdrawalProps {
  id: string
  affiliateId: string
  amountCents: number
  pixKey: string
  status: WithdrawalStatus
  requestedAt: Date
  processedAt: Date | null
  paidAt: Date | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Entidade `Withdrawal` — solicitação de saque de um afiliado.
 *
 * Máquina de estados (requisito): `RECEIVED → PROCESSING → PAID`; `RECEIVED` e
 * `PROCESSING` também podem ir para `REJECTED`. `pix_key` é snapshot.
 */
export class Withdrawal {
  private constructor(
    private readonly _id: string,
    private readonly _affiliateId: string,
    private readonly _amountCents: number,
    private readonly _pixKey: string,
    private _status: WithdrawalStatus,
    private readonly _requestedAt: Date,
    private _processedAt: Date | null,
    private _paidAt: Date | null,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static create(props: CreateWithdrawalProps): Withdrawal {
    if (!Number.isInteger(props.amountCents) || props.amountCents <= 0) {
      throw new InvalidWithdrawalError(
        'Valor do saque deve ser um inteiro positivo (centavos)',
      )
    }
    if (props.pixKey.trim().length === 0) {
      throw new InvalidWithdrawalError(
        'Chave Pix é obrigatória para solicitar saque',
      )
    }
    const now = new Date()
    return new Withdrawal(
      props.id,
      props.affiliateId,
      props.amountCents,
      props.pixKey.trim(),
      'RECEIVED',
      now,
      null,
      null,
      now,
      now,
    )
  }

  static reconstitute(props: ReconstructWithdrawalProps): Withdrawal {
    return new Withdrawal(
      props.id,
      props.affiliateId,
      props.amountCents,
      props.pixKey,
      props.status,
      props.requestedAt,
      props.processedAt,
      props.paidAt,
      props.createdAt,
      props.updatedAt,
    )
  }

  markProcessing(now = new Date()): void {
    this.transition('PROCESSING')
    this._processedAt = now
    this.touch()
  }

  markPaid(now = new Date()): void {
    this.transition('PAID')
    this._paidAt = now
    this.touch()
  }

  markRejected(): void {
    this.transition('REJECTED')
    this.touch()
  }

  private transition(target: WithdrawalStatus): void {
    const allowed = WITHDRAWAL_TRANSITIONS[this._status]
    if (!allowed.includes(target)) {
      throw new InvalidWithdrawalError(
        `Transição de saque inválida: ${this._status} → ${target}`,
      )
    }
    this._status = target
  }

  private touch(): void {
    this._updatedAt = new Date()
  }

  get id(): string {
    return this._id
  }
  get affiliateId(): string {
    return this._affiliateId
  }
  get amountCents(): number {
    return this._amountCents
  }
  get pixKey(): string {
    return this._pixKey
  }
  get status(): WithdrawalStatus {
    return this._status
  }
  get requestedAt(): Date {
    return this._requestedAt
  }
  get processedAt(): Date | null {
    return this._processedAt
  }
  get paidAt(): Date | null {
    return this._paidAt
  }
  get createdAt(): Date {
    return this._createdAt
  }
  get updatedAt(): Date {
    return this._updatedAt
  }
}
