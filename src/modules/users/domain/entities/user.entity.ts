import { Email } from '../value-objects/email.vo'
import { DomainError } from '../../../../common/errors/domain-error'

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  BLOCKED = 'BLOCKED',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
}

export class UserAlreadyDeletedError extends DomainError {
  constructor(id: string) {
    super(`Usuário ${id} já foi desativado`, 400)
  }
}

export interface CreateUserProps {
  id: string
  name: string
  email: Email
  passwordHash: string
  phone?: string | null
}

export interface UpdateProfileProps {
  name?: string
  phone?: string | null
}

/**
 * Agregado User.
 * Encapsula as regras de negócio do ciclo de vida do usuário: criação em
 * estado pendente de verificação, verificação de e-mail, bloqueio, soft
 * delete e atualização de perfil.
 */
export class User {
  private constructor(
    private readonly _id: string,
    private _name: string,
    private readonly _email: Email,
    private _passwordHash: string,
    private _phone: string | null,
    private _status: UserStatus,
    private _emailVerifiedAt: Date | null,
    private _lastLoginAt: Date | null,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
    private _deletedAt: Date | null,
  ) {}

  static create(props: CreateUserProps): User {
    const now = new Date()
    return new User(
      props.id,
      props.name,
      props.email,
      props.passwordHash,
      props.phone ?? null,
      UserStatus.PENDING_VERIFICATION,
      null,
      null,
      now,
      now,
      null,
    )
  }

  /** Reconstrói um usuário já existente a partir do banco (usado pelo mapper). */
  static reconstitute(props: {
    id: string
    name: string
    email: Email
    passwordHash: string
    phone: string | null
    status: UserStatus
    emailVerifiedAt: Date | null
    lastLoginAt: Date | null
    createdAt: Date
    updatedAt: Date
    deletedAt: Date | null
  }): User {
    return new User(
      props.id,
      props.name,
      props.email,
      props.passwordHash,
      props.phone,
      props.status,
      props.emailVerifiedAt,
      props.lastLoginAt,
      props.createdAt,
      props.updatedAt,
      props.deletedAt,
    )
  }

  verifyEmail(): void {
    this.assertNotDeleted()
    this._emailVerifiedAt = new Date()
    this._status = UserStatus.ACTIVE
    this.touch()
  }

  block(): void {
    this.assertNotDeleted()
    this._status = UserStatus.BLOCKED
    this.touch()
  }

  activate(): void {
    this.assertNotDeleted()
    this._status = UserStatus.ACTIVE
    this.touch()
  }

  deactivate(): void {
    this.assertNotDeleted()
    this._deletedAt = new Date()
    this._status = UserStatus.INACTIVE
    this.touch()
  }

  /** Reativa um usuário desativado (soft delete) — reverte `deactivate()`. */
  restore(): void {
    this._deletedAt = null
    this._status = UserStatus.ACTIVE
    this.touch()
  }

  updateProfile(props: UpdateProfileProps): void {
    this.assertNotDeleted()
    if (props.name !== undefined) {
      this._name = props.name
    }
    if (props.phone !== undefined) {
      this._phone = props.phone
    }
    this.touch()
  }

  changePassword(passwordHash: string): void {
    this.assertNotDeleted()
    this._passwordHash = passwordHash
    this.touch()
  }

  registerLogin(): void {
    this.assertNotDeleted()
    this._lastLoginAt = new Date()
    this.touch()
  }

  private assertNotDeleted(): void {
    if (this._deletedAt !== null) {
      throw new UserAlreadyDeletedError(this._id)
    }
  }

  private touch(): void {
    this._updatedAt = new Date()
  }

  // ── getters ────────────────────────────────────────────────────────────────

  get id(): string {
    return this._id
  }

  get name(): string {
    return this._name
  }

  get email(): Email {
    return this._email
  }

  get passwordHash(): string {
    return this._passwordHash
  }

  get phone(): string | null {
    return this._phone
  }

  get status(): UserStatus {
    return this._status
  }

  get emailVerifiedAt(): Date | null {
    return this._emailVerifiedAt
  }

  get lastLoginAt(): Date | null {
    return this._lastLoginAt
  }

  get createdAt(): Date {
    return this._createdAt
  }

  get updatedAt(): Date {
    return this._updatedAt
  }

  get deletedAt(): Date | null {
    return this._deletedAt
  }
}
