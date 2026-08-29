import type { WebhookEvent } from '../entities/webhook-event.entity'
import type { PaymentProvider } from '../value-objects/payment-provider.vo'

/**
 * Porta do repositório de eventos de webhook (idempotência — RNF09).
 */
export interface WebhookEventRepositoryPort {
  save(event: WebhookEvent): Promise<void>
  findByProviderEventId(
    provider: PaymentProvider,
    eventId: string,
  ): Promise<WebhookEvent | null>
}

export const WEBHOOK_EVENT_REPOSITORY_PORT = Symbol(
  'WEBHOOK_EVENT_REPOSITORY_PORT',
)
