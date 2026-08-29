import { WebhookEvent } from '../webhook-event.entity'

describe('WebhookEvent (entidade)', () => {
  it('cria com status RECEIVED por padrão', () => {
    const event = WebhookEvent.create({
      id: 'evt-1',
      provider: 'MERCADO_PAGO',
      eventId: 'evt-123',
      eventType: 'payment',
      payload: { id: 123, action: 'payment.created' },
    })

    expect(event.status).toBe('RECEIVED')
    expect(event.eventId).toBe('evt-123')
    expect(event.payload).toEqual({ id: 123, action: 'payment.created' })
    expect(event.processedAt).toBeNull()
  })

  it('marca como PROCESSED', () => {
    const event = WebhookEvent.create({
      id: 'evt-1',
      provider: 'MERCADO_PAGO',
      eventId: 'evt-123',
      eventType: 'payment',
      payload: {},
    })

    event.markProcessed()

    expect(event.status).toBe('PROCESSED')
    expect(event.processedAt).not.toBeNull()
  })

  it('marca como FAILED com erro', () => {
    const event = WebhookEvent.create({
      id: 'evt-1',
      provider: 'MERCADO_PAGO',
      eventId: 'evt-123',
      eventType: 'payment',
      payload: {},
    })

    event.markFailed('assinatura inválida')

    expect(event.status).toBe('FAILED')
    expect(event.error).toBe('assinatura inválida')
  })

  it('marca como DUPLICATE', () => {
    const event = WebhookEvent.create({
      id: 'evt-1',
      provider: 'MERCADO_PAGO',
      eventId: 'evt-123',
      eventType: 'payment',
      payload: {},
    })

    event.markDuplicate()

    expect(event.status).toBe('DUPLICATE')
  })

  it('reconstitui um evento persistido', () => {
    const now = new Date()
    const event = WebhookEvent.reconstitute({
      id: 'evt-1',
      provider: 'MERCADO_PAGO',
      eventId: 'evt-123',
      eventType: 'payment',
      payload: { a: 1 },
      status: 'PROCESSED',
      processedAt: now,
      error: null,
      receivedAt: now,
      createdAt: now,
    })

    expect(event.status).toBe('PROCESSED')
    expect(event.processedAt).toBe(now)
  })
})
