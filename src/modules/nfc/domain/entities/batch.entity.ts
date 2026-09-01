import { DomainError } from '../../../../common/errors/domain-error'

export enum BatchStatus {
  PENDING = 'PENDING',
  GENERATING = 'GENERATING',
  GENERATED = 'GENERATED',
  WRITING = 'WRITING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export class InvalidBatchStatusTransitionError extends DomainError {
  constructor(from: BatchStatus, to: BatchStatus) {
    super(`Transição inválida de status do lote: ${from} → ${to}`, 400)
  }
}

const VALID_TRANSITIONS: Record<BatchStatus, BatchStatus[]> = {
  [BatchStatus.PENDING]: [BatchStatus.GENERATING, BatchStatus.CANCELLED],
  [BatchStatus.GENERATING]: [BatchStatus.GENERATED, BatchStatus.FAILED],
  [BatchStatus.GENERATED]: [BatchStatus.WRITING, BatchStatus.CANCELLED],
  [BatchStatus.WRITING]: [BatchStatus.COMPLETED, BatchStatus.FAILED],
  [BatchStatus.COMPLETED]: [],
  [BatchStatus.FAILED]: [],
  [BatchStatus.CANCELLED]: [],
}

export interface CreateBatchProps {
  id: string
  name: string
  quantity: number
  createdBy: string
  description?: string | null
  prefix?: string | null
  externalRef?: string | null
}

export interface ReconstructBatchProps {
  id: string
  name: string
  description: string | null
  prefix: string | null
  externalRef: string | null
  quantity: number
  status: BatchStatus
  generatedCount: number
  writtenCount: number
  verifiedCount: number
  failedCount: number
  createdBy: string
  startedAt: Date | null
  completedAt: Date | null
  cancelledAt: Date | null
  cancelReason: string | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Agregado Batch — lote de produção.
 * Encapsula o ciclo de vida do lote e os contadores de progresso.
 */
export class Batch {
  private constructor(
    private readonly _id: string,
    private readonly _name: string,
    private readonly _description: string | null,
    private readonly _prefix: string | null,
    private readonly _externalRef: string | null,
    private readonly _quantity: number,
    private _status: BatchStatus,
    private _generatedCount: number,
    private _writtenCount: number,
    private _verifiedCount: number,
    private _failedCount: number,
    private readonly _createdBy: string,
    private _startedAt: Date | null,
    private _completedAt: Date | null,
    private _cancelledAt: Date | null,
    private _cancelReason: string | null,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static create(props: CreateBatchProps): Batch {
    const now = new Date()
    return new Batch(
      props.id,
      props.name,
      props.description ?? null,
      props.prefix ?? null,
      props.externalRef ?? null,
      props.quantity,
      BatchStatus.PENDING,
      0,
      0,
      0,
      0,
      props.createdBy,
      null,
      null,
      null,
      null,
      now,
      now,
    )
  }

  static reconstitute(props: ReconstructBatchProps): Batch {
    return new Batch(
      props.id,
      props.name,
      props.description,
      props.prefix,
      props.externalRef,
      props.quantity,
      props.status,
      props.generatedCount,
      props.writtenCount,
      props.verifiedCount,
      props.failedCount,
      props.createdBy,
      props.startedAt,
      props.completedAt,
      props.cancelledAt,
      props.cancelReason,
      props.createdAt,
      props.updatedAt,
    )
  }

  startGenerating(): void {
    this.transitionTo(BatchStatus.GENERATING)
    this._startedAt = new Date()
  }

  finishGeneration(generatedCount: number): void {
    this.transitionTo(BatchStatus.GENERATED)
    this._generatedCount = generatedCount
  }

  startWriting(): void {
    this.transitionTo(BatchStatus.WRITING)
  }

  /**
   * Garante que o lote está em WRITING ao iniciar a primeira gravação.
   * Idempotente: só transiciona GENERATED → WRITING; demais status são no-op
   * (desbloqueia o "Completar", que exige WRITING).
   */
  ensureWriting(): void {
    if (this._status === BatchStatus.GENERATED) {
      this.startWriting()
    }
  }

  complete(): void {
    this.transitionTo(BatchStatus.COMPLETED)
    this._completedAt = new Date()
  }

  cancel(reason: string): void {
    this.transitionTo(BatchStatus.CANCELLED)
    this._cancelledAt = new Date()
    this._cancelReason = reason
  }

  incrementWritten(): void {
    this._writtenCount += 1
    this.touch()
  }

  /** Decrementa o contador de gravados (piso 0) — reset de card (Revisão 3). */
  decrementWritten(): void {
    this._writtenCount = Math.max(0, this._writtenCount - 1)
    this.touch()
  }

  incrementVerified(): void {
    this._verifiedCount += 1
    this.touch()
  }

  incrementFailed(): void {
    this._failedCount += 1
    this.touch()
  }

  private transitionTo(to: BatchStatus): void {
    const allowed = VALID_TRANSITIONS[this._status] ?? []
    if (!allowed.includes(to)) {
      throw new InvalidBatchStatusTransitionError(this._status, to)
    }
    this._status = to
    this.touch()
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
  get description(): string | null {
    return this._description
  }
  get prefix(): string | null {
    return this._prefix
  }
  get externalRef(): string | null {
    return this._externalRef
  }
  get quantity(): number {
    return this._quantity
  }
  get status(): BatchStatus {
    return this._status
  }
  get generatedCount(): number {
    return this._generatedCount
  }
  get writtenCount(): number {
    return this._writtenCount
  }
  get verifiedCount(): number {
    return this._verifiedCount
  }
  get failedCount(): number {
    return this._failedCount
  }
  get createdBy(): string {
    return this._createdBy
  }
  get startedAt(): Date | null {
    return this._startedAt
  }
  get completedAt(): Date | null {
    return this._completedAt
  }
  get cancelledAt(): Date | null {
    return this._cancelledAt
  }
  get cancelReason(): string | null {
    return this._cancelReason
  }
  get createdAt(): Date {
    return this._createdAt
  }
  get updatedAt(): Date {
    return this._updatedAt
  }
}
