import { AccessSource } from '../../../../common/constants/access-source'

export interface CreateAccessEventProps {
  id: string
  petId?: string | null
  nfcTagId?: string | null
  source: AccessSource
  deviceType?: string | null
  ipHash?: string | null
  locationApprox?: string | null
}

export interface ReconstructAccessEventProps {
  id: string
  petId: string | null
  nfcTagId: string | null
  source: AccessSource
  deviceType: string | null
  ipHash: string | null
  locationApprox: string | null
  createdAt: Date
}

/**
 * Entidade `AccessEvent` — registro imutável (append-only) de um acesso ao
 * perfil público (doc-sistema §modelo-de-dados / RF18).
 *
 * Não possui regra de mutação: analytics é gravado e nunca alterado. A leitura
 * (histórico) é feature Premium (Fase 7) — nesta fase apenas registramos.
 */
export class AccessEvent {
  private constructor(
    private readonly _id: string,
    private readonly _petId: string | null,
    private readonly _nfcTagId: string | null,
    private readonly _source: AccessSource,
    private readonly _deviceType: string | null,
    private readonly _ipHash: string | null,
    private readonly _locationApprox: string | null,
    private readonly _createdAt: Date,
  ) {}

  static create(props: CreateAccessEventProps): AccessEvent {
    return new AccessEvent(
      props.id,
      props.petId ?? null,
      props.nfcTagId ?? null,
      props.source,
      props.deviceType ?? null,
      props.ipHash ?? null,
      props.locationApprox ?? null,
      new Date(),
    )
  }

  static reconstitute(props: ReconstructAccessEventProps): AccessEvent {
    return new AccessEvent(
      props.id,
      props.petId,
      props.nfcTagId,
      props.source,
      props.deviceType,
      props.ipHash,
      props.locationApprox,
      props.createdAt,
    )
  }

  get id(): string {
    return this._id
  }
  get petId(): string | null {
    return this._petId
  }
  get nfcTagId(): string | null {
    return this._nfcTagId
  }
  get source(): AccessSource {
    return this._source
  }
  get deviceType(): string | null {
    return this._deviceType
  }
  get ipHash(): string | null {
    return this._ipHash
  }
  get locationApprox(): string | null {
    return this._locationApprox
  }
  get createdAt(): Date {
    return this._createdAt
  }
}
