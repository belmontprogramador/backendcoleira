import { DomainError } from '../../../../common/errors/domain-error'
import type { ShipmentStatus } from '../value-objects/shipment-status.vo'

export class InvalidShipmentStatusTransitionError extends DomainError {
  constructor(from: ShipmentStatus, to: ShipmentStatus) {
    super(`Transição inválida de status do envio: ${from} → ${to}`, 400)
  }
}

export class InvalidShipmentError extends DomainError {
  constructor(message: string) {
    super(message, 400)
  }
}

const VALID_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  PENDING: ['POSTED', 'CANCELLED'],
  POSTED: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
}

export interface CreateShipmentProps {
  id: string
  orderId: string
  meOrderId: string
  protocol: string
  serviceId: number
  tracking?: string | null
  trackingUrl?: string | null
  labelUrl?: string | null
}

export interface ReconstructShipmentProps {
  id: string
  orderId: string
  meOrderId: string
  protocol: string
  serviceId: number
  status: ShipmentStatus
  tracking: string | null
  trackingUrl: string | null
  labelUrl: string | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Envio (etiqueta Melhor Envio) — 1:1 com um `Order`.
 * Registra o id da etiqueta no ME (`meOrderId`) e o rastreio, para o `TrackOrder`
 * consultar a posição ao vivo via `ShippingGatewayPort.track`.
 */
export class Shipment {
  private constructor(
    private readonly _id: string,
    private readonly _orderId: string,
    private readonly _meOrderId: string,
    private readonly _protocol: string,
    private readonly _serviceId: number,
    private _status: ShipmentStatus,
    private _tracking: string | null,
    private _trackingUrl: string | null,
    private _labelUrl: string | null,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static create(props: CreateShipmentProps): Shipment {
    if (!props.id?.trim()) throw new InvalidShipmentError('id inválido')
    if (!props.orderId?.trim()) {
      throw new InvalidShipmentError('orderId inválido')
    }
    if (!props.meOrderId?.trim()) {
      throw new InvalidShipmentError('meOrderId inválido')
    }
    if (!props.protocol?.trim()) {
      throw new InvalidShipmentError('protocol inválido')
    }
    if (!Number.isInteger(props.serviceId) || props.serviceId < 1) {
      throw new InvalidShipmentError('serviceId inválido')
    }
    const now = new Date()
    return new Shipment(
      props.id,
      props.orderId,
      props.meOrderId,
      props.protocol,
      props.serviceId,
      'PENDING',
      props.tracking ?? null,
      props.trackingUrl ?? null,
      props.labelUrl ?? null,
      now,
      now,
    )
  }

  static reconstitute(props: ReconstructShipmentProps): Shipment {
    return new Shipment(
      props.id,
      props.orderId,
      props.meOrderId,
      props.protocol,
      props.serviceId,
      props.status,
      props.tracking,
      props.trackingUrl,
      props.labelUrl,
      props.createdAt,
      props.updatedAt,
    )
  }

  /** PENDING → POSTED (etiqueta postada na transportadora). */
  markPosted(): void {
    this.transitionTo('POSTED')
  }

  /** POSTED → DELIVERED (entrega confirmada). */
  markDelivered(): void {
    this.transitionTo('DELIVERED')
  }

  /**
   * Atualiza o rastreio (código + URL) quando o webhook da Melhor Envio informa
   * novos valores. Só sobrescreve com valores não-vazios; retorna `true` se
   * algum campo mudou (para o use case saber se precisa persistir).
   */
  applyTracking(tracking?: string | null, trackingUrl?: string | null): boolean {
    let changed = false
    if (tracking && tracking !== this._tracking) {
      this._tracking = tracking
      changed = true
    }
    if (trackingUrl && trackingUrl !== this._trackingUrl) {
      this._trackingUrl = trackingUrl
      changed = true
    }
    if (changed) {
      this._updatedAt = new Date()
    }
    return changed
  }

  private transitionTo(to: ShipmentStatus): void {
    const allowed = VALID_TRANSITIONS[this._status] ?? []
    if (!allowed.includes(to)) {
      throw new InvalidShipmentStatusTransitionError(this._status, to)
    }
    this._status = to
    this._updatedAt = new Date()
  }

  get id(): string {
    return this._id
  }
  get orderId(): string {
    return this._orderId
  }
  get meOrderId(): string {
    return this._meOrderId
  }
  get protocol(): string {
    return this._protocol
  }
  get serviceId(): number {
    return this._serviceId
  }
  get status(): ShipmentStatus {
    return this._status
  }
  get tracking(): string | null {
    return this._tracking
  }
  get trackingUrl(): string | null {
    return this._trackingUrl
  }
  get labelUrl(): string | null {
    return this._labelUrl
  }
  get createdAt(): Date {
    return this._createdAt
  }
  get updatedAt(): Date {
    return this._updatedAt
  }
}
