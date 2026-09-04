import { AccessSource } from '../../../../common/constants/access-source'
import { DomainError } from '../../../../common/errors/domain-error'

export class InvalidContactMessageError extends DomainError {
  constructor() {
    super('Mensagem de contato não pode ser vazia', 400)
  }
}

export interface CreateContactMessageProps {
  id: string
  petId: string
  nfcTagId?: string | null
  senderName?: string | null
  senderPhone?: string | null
  senderEmail?: string | null
  message: string
  source: AccessSource
  ipHash?: string | null
  userAgent?: string | null
  locationApprox?: string | null
  latitude?: number | null
  longitude?: number | null
}

export interface ReconstructContactMessageProps {
  id: string
  petId: string
  nfcTagId: string | null
  senderName: string | null
  senderPhone: string | null
  senderEmail: string | null
  message: string
  source: AccessSource
  ipHash: string | null
  userAgent: string | null
  locationApprox: string | null
  latitude: number | null
  longitude: number | null
  readAt: Date | null
  createdAt: Date
}

/**
 * Entidade `ContactMessage` — mensagem do visitante para o tutor (RF14, Basic).
 * Invariante: `message` nunca vazio (após trim).
 */
export class ContactMessage {
  private constructor(
    private readonly _id: string,
    private readonly _petId: string,
    private readonly _nfcTagId: string | null,
    private readonly _senderName: string | null,
    private readonly _senderPhone: string | null,
    private readonly _senderEmail: string | null,
    private readonly _message: string,
    private readonly _source: AccessSource,
    private readonly _ipHash: string | null,
    private readonly _userAgent: string | null,
    private readonly _locationApprox: string | null,
    private readonly _latitude: number | null,
    private readonly _longitude: number | null,
    private _readAt: Date | null,
    private readonly _createdAt: Date,
  ) {}

  static create(props: CreateContactMessageProps): ContactMessage {
    const message = props.message.trim()
    if (message.length === 0) {
      throw new InvalidContactMessageError()
    }
    return new ContactMessage(
      props.id,
      props.petId,
      props.nfcTagId ?? null,
      props.senderName ?? null,
      props.senderPhone ?? null,
      props.senderEmail ?? null,
      message,
      props.source,
      props.ipHash ?? null,
      props.userAgent ?? null,
      props.locationApprox ?? null,
      props.latitude ?? null,
      props.longitude ?? null,
      null,
      new Date(),
    )
  }

  static reconstitute(props: ReconstructContactMessageProps): ContactMessage {
    return new ContactMessage(
      props.id,
      props.petId,
      props.nfcTagId,
      props.senderName,
      props.senderPhone,
      props.senderEmail,
      props.message,
      props.source,
      props.ipHash,
      props.userAgent,
      props.locationApprox,
      props.latitude,
      props.longitude,
      props.readAt,
      props.createdAt,
    )
  }

  /** Marca como lida. Idempotente: preserva o timestamp da primeira leitura. */
  markRead(): void {
    if (this._readAt === null) {
      this._readAt = new Date()
    }
  }

  get id(): string {
    return this._id
  }
  get petId(): string {
    return this._petId
  }
  get nfcTagId(): string | null {
    return this._nfcTagId
  }
  get senderName(): string | null {
    return this._senderName
  }
  get senderPhone(): string | null {
    return this._senderPhone
  }
  get senderEmail(): string | null {
    return this._senderEmail
  }
  get message(): string {
    return this._message
  }
  get source(): AccessSource {
    return this._source
  }
  get ipHash(): string | null {
    return this._ipHash
  }
  get userAgent(): string | null {
    return this._userAgent
  }
  get locationApprox(): string | null {
    return this._locationApprox
  }
  get latitude(): number | null {
    return this._latitude
  }
  get longitude(): number | null {
    return this._longitude
  }
  get readAt(): Date | null {
    return this._readAt
  }
  get isRead(): boolean {
    return this._readAt !== null
  }
  get createdAt(): Date {
    return this._createdAt
  }
}
