import { WebhookEventMapper } from '../webhook-event.mapper'
import { WebhookEvent } from '../../../domain/entities/webhook-event.entity'
import type { WebhookEventModel } from '../../../../../generated/prisma/models/WebhookEvent'

describe('WebhookEventMapper', () => {
  it('converte domínio → persistência (snake_case)', () => {
    const event = WebhookEvent.create({
      id: 'evt-1',
      provider: 'MERCADO_PAGO',
      eventId: 'mp-evt-123',
      eventType: 'payment.updated',
      payload: { status: 'approved' },
    })

    const data = WebhookEventMapper.toPersistence(event)

    expect(data.id).toBe('evt-1')
    expect(data.provider).toBe('MERCADO_PAGO')
    expect(data.event_id).toBe('mp-evt-123')
    expect(data.event_type).toBe('payment.updated')
    expect(data.payload).toEqual({ status: 'approved' })
    expect(data.status).toBe('RECEIVED')
    expect(data.processed_at).toBeNull()
    expect(data.error).toBeNull()
  })

  it('converte persistência → domínio', () => {
    const now = new Date('2026-01-01T00:00:00.000Z')
    const model = {
      id: 'evt-1',
      provider: 'MERCADO_PAGO',
      event_id: 'mp-evt-123',
      event_type: 'payment.updated',
      payload: { status: 'approved' },
      status: 'PROCESSED',
      processed_at: now,
      error: null,
      received_at: now,
      created_at: now,
    } as WebhookEventModel

    const event = WebhookEventMapper.toDomain(model)

    expect(event.id).toBe('evt-1')
    expect(event.eventId).toBe('mp-evt-123')
    expect(event.status).toBe('PROCESSED')
    expect(event.processedAt).toEqual(now)
    expect(event.payload).toEqual({ status: 'approved' })
  })
})
