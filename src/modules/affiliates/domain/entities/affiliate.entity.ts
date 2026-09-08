import { DomainError } from '../../../../common/errors/domain-error'
import type { AffiliateStatus } from '../value-objects/affiliate-status.vo'
import { CommissionConfig } from '../value-objects/commission-config.vo'

export class InvalidAffiliateError extends DomainError {
  constructor(message: string) {
    super(message, 400)
  }
}

/** Referral code é um slug minúsculo de 3 a 32 chars (letras, dígitos, hífen). */
export const AFFILIATE_CODE_PATTERN = /^[a-z0-9-]{3,32}$/

export interface CreateAffiliateProps {
  id: string
  userId?: string | null
  code: string
  name: string
  email: string
  phone?: string | null
  document?: string | null
  pixKey?: string | null
  bankName?: string | null
  bankAgency?: string | null
  bankAccount?: string | null
  commission?: CommissionConfig
  minWithdrawalCents?: number
  status?: AffiliateStatus
}

export interface ReconstructAffiliateProps {
  id: string
  userId: string | null
  code: string
  name: string
  email: string
  phone: string | null
  document: string | null
  pixKey: string | null
  bankName: string | null
  bankAgency: string | null
  bankAccount: string | null
  commission: CommissionConfig
  minWithdrawalCents: number
  status: AffiliateStatus
  createdAt: Date
  updatedAt: Date
}

/**
 * Entidade `Affiliate` — identidade de um afiliado de vendas.
 *
 * `code` é o referral code definido pelo admin (slug único), imutável após a
 * criação. A configuração de comissão e o piso de saque são editáveis.
 */
export class Affiliate {
  private constructor(
    private readonly _id: string,
    private _userId: string | null,
    private readonly _code: string,
    private _name: string,
    private _email: string,
    private _phone: string | null,
    private _document: string | null,
    private _pixKey: string | null,
    private _bankName: string | null,
    private _bankAgency: string | null,
    private _bankAccount: string | null,
    private _commission: CommissionConfig,
    private _minWithdrawalCents: number,
    private _status: AffiliateStatus,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static create(props: CreateAffiliateProps): Affiliate {
    const code = props.code.trim().toLowerCase()
    const name = props.name.trim()
    const email = props.email.trim().toLowerCase()

    if (!AFFILIATE_CODE_PATTERN.test(code)) {
      throw new InvalidAffiliateError(
        'Código do afiliado inválido (use 3-32 chars: letras minúsculas, números e hífen)',
      )
    }
    if (name.length === 0) {
      throw new InvalidAffiliateError('Nome do afiliado é obrigatório')
    }
    if (email.length === 0) {
      throw new InvalidAffiliateError('Email do afiliado é obrigatório')
    }
    const minWithdrawal = props.minWithdrawalCents ?? 0
    if (!Number.isInteger(minWithdrawal) || minWithdrawal < 0) {
      throw new InvalidAffiliateError(
        'Valor mínimo de saque deve ser um inteiro não-negativo (centavos)',
      )
    }

    const now = new Date()
    return new Affiliate(
      props.id,
      props.userId ?? null,
      code,
      name,
      email,
      props.phone ?? null,
      props.document ?? null,
      props.pixKey ?? null,
      props.bankName ?? null,
      props.bankAgency ?? null,
      props.bankAccount ?? null,
      props.commission ?? CommissionConfig.create({ type: 'PERCENTAGE', fixedCents: 0, percentBps: 0 }),
      minWithdrawal,
      props.status ?? 'ACTIVE',
      now,
      now,
    )
  }

  static reconstitute(props: ReconstructAffiliateProps): Affiliate {
    return new Affiliate(
      props.id,
      props.userId,
      props.code,
      props.name,
      props.email,
      props.phone,
      props.document,
      props.pixKey,
      props.bankName,
      props.bankAgency,
      props.bankAccount,
      props.commission,
      props.minWithdrawalCents,
      props.status,
      props.createdAt,
      props.updatedAt,
    )
  }

  /** Associa o `User` criado no cadastro (1:1). */
  linkUser(userId: string): void {
    this._userId = userId
    this.touch()
  }

  activate(): void {
    if (this._status === 'ACTIVE') {
      return
    }
    this._status = 'ACTIVE'
    this.touch()
  }

  deactivate(): void {
    if (this._status === 'INACTIVE') {
      return
    }
    this._status = 'INACTIVE'
    this.touch()
  }

  changeCommission(config: CommissionConfig): void {
    this._commission = config
    this.touch()
  }

  changeMinWithdrawal(cents: number): void {
    if (!Number.isInteger(cents) || cents < 0) {
      throw new InvalidAffiliateError(
        'Valor mínimo de saque deve ser um inteiro não-negativo (centavos)',
      )
    }
    this._minWithdrawalCents = cents
    this.touch()
  }

  /**
   * Atualiza os dados editáveis do afiliado. Não mexe em `code`, comissão,
   * piso ou status (esses têm métodos próprios).
   */
  updateDetails(props: {
    name?: string
    email?: string
    phone?: string | null
    document?: string | null
    pixKey?: string | null
    bankName?: string | null
    bankAgency?: string | null
    bankAccount?: string | null
  }): void {
    if (props.name !== undefined) {
      const name = props.name.trim()
      if (name.length === 0) {
        throw new InvalidAffiliateError('Nome do afiliado é obrigatório')
      }
      this._name = name
    }
    if (props.email !== undefined) {
      const email = props.email.trim().toLowerCase()
      if (email.length === 0) {
        throw new InvalidAffiliateError('Email do afiliado é obrigatório')
      }
      this._email = email
    }
    if (props.phone !== undefined) {
      this._phone = props.phone
    }
    if (props.document !== undefined) {
      this._document = props.document
    }
    if (props.pixKey !== undefined) {
      this._pixKey = props.pixKey
    }
    if (props.bankName !== undefined) {
      this._bankName = props.bankName
    }
    if (props.bankAgency !== undefined) {
      this._bankAgency = props.bankAgency
    }
    if (props.bankAccount !== undefined) {
      this._bankAccount = props.bankAccount
    }
    this.touch()
  }

  isActive(): boolean {
    return this._status === 'ACTIVE'
  }

  private touch(): void {
    this._updatedAt = new Date()
  }

  get id(): string {
    return this._id
  }
  get userId(): string | null {
    return this._userId
  }
  get code(): string {
    return this._code
  }
  get name(): string {
    return this._name
  }
  get email(): string {
    return this._email
  }
  get phone(): string | null {
    return this._phone
  }
  get document(): string | null {
    return this._document
  }
  get pixKey(): string | null {
    return this._pixKey
  }
  get bankName(): string | null {
    return this._bankName
  }
  get bankAgency(): string | null {
    return this._bankAgency
  }
  get bankAccount(): string | null {
    return this._bankAccount
  }
  get commission(): CommissionConfig {
    return this._commission
  }
  get minWithdrawalCents(): number {
    return this._minWithdrawalCents
  }
  get status(): AffiliateStatus {
    return this._status
  }
  get createdAt(): Date {
    return this._createdAt
  }
  get updatedAt(): Date {
    return this._updatedAt
  }
}
