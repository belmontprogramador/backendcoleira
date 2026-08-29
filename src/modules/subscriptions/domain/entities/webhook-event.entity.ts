import type { PaymentProvider } from '../value-objects/payment-provider.vo'
import type { WebhookStatus } from '../value-objects/webhook-status.vo'

export interface CreateWebhookEventProps {
  id: string
  provider: PaymentProvider
  eventId: string
  eventType: string
  payload: Record<string, unknown>
}

export interface ReconstructWebhookEventProps {
  id: string
  provider: PaymentProvider
  eventId: string
  eventType: string
  payload: Record<string, unknown>
  status: WebhookStatus
  processedAt: Date | null
  error: string | null
  receivedAt: Date
  createdAt: Date
}

/**
 * Entidade `WebhookEvent` — registro de evento do gateway com estado de
 * processamento (D5). A unicidade de `(provider, event_id)` garante a
 * idempotência (RNF09).
 */
export class WebhookEvent {
  private constructor(
    private readonly _id: string,
    private readonly _provider: PaymentProvider,
    private readonly _eventId: string,
    private readonly _eventType: string,
    private readonly _payload: Record<string, unknown>,
    private _status: WebhookStatus,
    private _processedAt: Date | null,
    private _error: string | null,
    private readonly _receivedAt: Date,
    private readonly _createdAt: Date,
  ) {}

  static create(props: CreateWebhookEventProps): WebhookEvent {
    const now = new Date()
    return new WebhookEvent(
      props.id,
      props.provider,
      props.eventId,
      props.eventType,
      props.payload,
      'RECEIVED',
      null,
      null,
      now,
      now,
    )
  }

  static reconstitute(props: ReconstructWebhookEventProps): WebhookEvent {
    return new WebhookEvent(
      props.id,
      props.provider,
      props.eventId,
      props.eventType,
      props.payload,
      props.status,
      props.processedAt,
      props.error,
      props.receivedAt,
      props.createdAt,
    )
  }

  markProcessed(): void {
    this._status = 'PROCESSED'
    this._processedAt = new Date()
    this._error = null
  }

  markFailed(error: string): void {
    this._status = 'FAILED'
    this._error = error
  }

  markDuplicate(): void {
    this._status = 'DUPLICATE'
  }

  get id(): string {
    return this._id
  }
  get provider(): PaymentProvider {
    return this._provider
  }
  get eventId(): string {
    return this._eventId
  }
  get eventType(): string {
    return this._eventType
  }
  get payload(): Record<string, unknown> {
    return this._payload
  }
  get status(): WebhookStatus {
    return this._status
  }
  get processedAt(): Date | null {
    return this._processedAt
  }
  get error(): string | null {
    return this._error
  }
  get receivedAt(): Date {
    return this._receivedAt
  }
  get createdAt(): Date {
    return this._createdAt
  }
}
