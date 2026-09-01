import { PublicId } from '../value-objects/public-id.vo'
import { Uid } from '../value-objects/uid.vo'
import { DomainError } from '../../../../common/errors/domain-error'

export enum TagStatus {
  CREATED = 'CREATED',
  READY = 'READY',
  IN_STOCK = 'IN_STOCK',
  SOLD = 'SOLD',
  DELIVERED = 'DELIVERED',
  AVAILABLE = 'AVAILABLE',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  LOST = 'LOST',
  DEACTIVATED = 'DEACTIVATED',
  RETIRED = 'RETIRED',
}

export class InvalidTagStatusTransitionError extends DomainError {
  constructor(from: TagStatus, to: TagStatus) {
    super(`Transição inválida de status: ${from} → ${to}`, 400)
  }
}

export class TagAlreadyActivatedError extends DomainError {
  constructor(id: string) {
    super(`Pingente já ativado: ${id}`, 400)
  }
}

export class TagNotActiveError extends DomainError {
  constructor(id: string) {
    super(`Operação exige pingente ativo: ${id}`, 400)
  }
}

/**
 * Transições válidas de estado do pingente (doc-sistema §produto-identidade §9).
 * Fluxo normal: CREATED → READY → IN_STOCK → SOLD → DELIVERED → AVAILABLE → ACTIVE.
 * As transições de AVAILABLE em diante são da Fase 4/5.
 */
const VALID_TRANSITIONS: Record<TagStatus, TagStatus[]> = {
  [TagStatus.CREATED]: [TagStatus.READY],
  [TagStatus.READY]: [TagStatus.IN_STOCK, TagStatus.CREATED],
  [TagStatus.IN_STOCK]: [TagStatus.SOLD],
  [TagStatus.SOLD]: [TagStatus.DELIVERED],
  [TagStatus.DELIVERED]: [
    TagStatus.AVAILABLE,
    TagStatus.ACTIVE,
    TagStatus.SUSPENDED,
    TagStatus.LOST,
  ],
  [TagStatus.AVAILABLE]: [TagStatus.ACTIVE, TagStatus.DEACTIVATED],
  [TagStatus.ACTIVE]: [
    TagStatus.AVAILABLE,
    TagStatus.SUSPENDED,
    TagStatus.LOST,
    TagStatus.DEACTIVATED,
    TagStatus.RETIRED,
  ],
  [TagStatus.SUSPENDED]: [TagStatus.ACTIVE, TagStatus.DEACTIVATED],
  [TagStatus.LOST]: [TagStatus.ACTIVE, TagStatus.DEACTIVATED],
  [TagStatus.DEACTIVATED]: [TagStatus.RETIRED],
  [TagStatus.RETIRED]: [],
}

export interface CreateNfcTagProps {
  id: string
  publicId: PublicId
  activationCodeEncrypted: string
  batchId?: string | null
}

export interface ReconstructNfcTagProps {
  id: string
  publicId: PublicId
  uid: Uid | null
  activationCodeEncrypted: string
  status: TagStatus
  batchId: string | null
  ownerId: string | null
  petId: string | null
  activatedAt: Date | null
  deactivatedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Agregado NfcTag — o pingente digital.
 * Encapsula as transições de estado do ciclo de vida físico (Fase 3).
 * Owner/pet/ativação são preenchidos na Fase 4.
 */
export class NfcTag {
  private constructor(
    private readonly _id: string,
    private readonly _publicId: PublicId,
    private _uid: Uid | null,
    private _activationCodeEncrypted: string,
    private _status: TagStatus,
    private _batchId: string | null,
    private _ownerId: string | null,
    private _petId: string | null,
    private _activatedAt: Date | null,
    private _deactivatedAt: Date | null,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static create(props: CreateNfcTagProps): NfcTag {
    const now = new Date()
    return new NfcTag(
      props.id,
      props.publicId,
      null,
      props.activationCodeEncrypted,
      TagStatus.CREATED,
      props.batchId ?? null,
      null,
      null,
      null,
      null,
      now,
      now,
    )
  }

  static reconstitute(props: ReconstructNfcTagProps): NfcTag {
    return new NfcTag(
      props.id,
      props.publicId,
      props.uid,
      props.activationCodeEncrypted,
      props.status,
      props.batchId,
      props.ownerId,
      props.petId,
      props.activatedAt,
      props.deactivatedAt,
      props.createdAt,
      props.updatedAt,
    )
  }

  markWritten(uid: Uid): void {
    if (this._status === TagStatus.READY) {
      // Regravação idempotente (Revisão 2): READY → READY não quebra,
      // apenas atualiza o uid e mantém o estado.
      this._uid = uid
      this.touch()
      return
    }
    this.transitionTo(TagStatus.READY)
    this._uid = uid
  }

  /**
   * Reset "virgem total" (Revisão 3): leva o pingente de volta a CREATED,
   * limpando uid + owner + pet + ativação. Preserva publicId + código
   * (identidade) — permite regravar o mesmo card quantas vezes for preciso.
   *
   * É um reset administrativo do OPERATOR (`tag:record`): ignora a máquina de
   * estados normal (não usa transitionTo) para aceitar QUALQUER estado de
   * origem (READY, AVAILABLE, ACTIVE, ...). Idempotente: se já CREATED sem
   * dados, não faz nada.
   */
  reset(): void {
    if (
      this._status === TagStatus.CREATED &&
      this._uid === null &&
      this._ownerId === null &&
      this._petId === null &&
      this._activatedAt === null &&
      this._deactivatedAt === null
    ) {
      return
    }
    this._status = TagStatus.CREATED
    this._uid = null
    this._ownerId = null
    this._petId = null
    this._activatedAt = null
    this._deactivatedAt = null
    this.touch()
  }

  /** Marca READY sem UID (Web NFC sem serialNumber) — Revisão 3. */
  markWrittenWithoutUid(): void {
    if (this._status === TagStatus.READY) {
      this.touch()
      return
    }
    this.transitionTo(TagStatus.READY)
  }

  markInStock(): void {
    this.transitionTo(TagStatus.IN_STOCK)
  }

  markSold(): void {
    this.transitionTo(TagStatus.SOLD)
  }

  markDelivered(): void {
    this.transitionTo(TagStatus.DELIVERED)
  }

  markAvailable(): void {
    this.transitionTo(TagStatus.AVAILABLE)
  }

  /**
   * Ativa o pingente (Fase 4). Aceita DELIVERED (transição automática) ou
   * AVAILABLE. Define o dono e o timestamp de ativação.
   */
  activate(ownerId: string): void {
    if (this._ownerId !== null) {
      throw new TagAlreadyActivatedError(this._id)
    }
    // DELIVERED → ACTIVE é permitido na máquina (transição automática).
    this.transitionTo(TagStatus.ACTIVE)
    this._ownerId = ownerId
    this._activatedAt = new Date()
  }

  associatePet(petId: string): void {
    this.assertActive()
    this._petId = petId
    this.touch()
  }

  disassociatePet(): void {
    this.assertActive()
    this._petId = null
    this.touch()
  }

  /** Desvincula: ACTIVE → AVAILABLE, limpa owner/pet. Mantém publicId + código (identidade preservada). */
  unlink(): void {
    this.assertActive()
    this.transitionTo(TagStatus.AVAILABLE)
    this._ownerId = null
    this._petId = null
    this._activatedAt = null
  }

  /** Aposenta (substituição): ACTIVE → RETIRED, limpa owner/pet. */
  retire(): void {
    this.assertActive()
    this.transitionTo(TagStatus.RETIRED)
    this._ownerId = null
    this._petId = null
  }

  markActive(): void {
    this.transitionTo(TagStatus.ACTIVE)
  }

  markSuspended(): void {
    this.transitionTo(TagStatus.SUSPENDED)
  }

  markLost(): void {
    this.transitionTo(TagStatus.LOST)
  }

  markDeactivated(): void {
    this.transitionTo(TagStatus.DEACTIVATED)
  }

  markRetired(): void {
    this.transitionTo(TagStatus.RETIRED)
  }

  private transitionTo(to: TagStatus): void {
    const allowed = VALID_TRANSITIONS[this._status] ?? []
    if (!allowed.includes(to)) {
      throw new InvalidTagStatusTransitionError(this._status, to)
    }
    this._status = to
    this.touch()
  }

  private assertActive(): void {
    if (this._status !== TagStatus.ACTIVE) {
      throw new TagNotActiveError(this._id)
    }
  }

  private touch(): void {
    this._updatedAt = new Date()
  }

  // ── getters ────────────────────────────────────────────────────────────────

  get id(): string {
    return this._id
  }
  get publicId(): PublicId {
    return this._publicId
  }
  get uid(): Uid | null {
    return this._uid
  }
  get activationCodeEncrypted(): string {
    return this._activationCodeEncrypted
  }
  get status(): TagStatus {
    return this._status
  }
  get batchId(): string | null {
    return this._batchId
  }
  get ownerId(): string | null {
    return this._ownerId
  }
  get petId(): string | null {
    return this._petId
  }
  get activatedAt(): Date | null {
    return this._activatedAt
  }
  get deactivatedAt(): Date | null {
    return this._deactivatedAt
  }
  get createdAt(): Date {
    return this._createdAt
  }
  get updatedAt(): Date {
    return this._updatedAt
  }
}
