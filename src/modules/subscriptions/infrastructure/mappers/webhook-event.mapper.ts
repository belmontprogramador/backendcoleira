import { WebhookEvent } from '../../domain/entities/webhook-event.entity'
import type { PaymentProvider } from '../../domain/value-objects/payment-provider.vo'
import type { WebhookStatus } from '../../domain/value-objects/webhook-status.vo'
import type { WebhookEventModel } from '../../../../generated/prisma/models/WebhookEvent'
import type { Prisma } from '../../../../generated/prisma/client'

/**
 * Converte a entidade `WebhookEvent` (domínio) para o formato de persistência
 * Prisma (snake_case) e vice-versa.
 */
export class WebhookEventMapper {
  static toPersistence(event: WebhookEvent): {
    id: string
    provider: PaymentProvider
    event_id: string
    event_type: string
    payload: Prisma.InputJsonValue
    status: WebhookStatus
    processed_at: Date | null
    error: string | null
    received_at: Date
    created_at: Date
  } {
    return {
      id: event.id,
      provider: event.provider,
      event_id: event.eventId,
      event_type: event.eventType,
      payload: event.payload as unknown as Prisma.InputJsonValue,
      status: event.status,
      processed_at: event.processedAt,
      error: event.error,
      received_at: event.receivedAt,
      created_at: event.createdAt,
    }
  }

  static toDomain(model: WebhookEventModel): WebhookEvent {
    return WebhookEvent.reconstitute({
      id: model.id,
      provider: model.provider,
      eventId: model.event_id,
      eventType: model.event_type,
      payload: model.payload as unknown as Record<string, unknown>,
      status: model.status,
      processedAt: model.processed_at,
      error: model.error,
      receivedAt: model.received_at,
      createdAt: model.created_at,
    })
  }
}
