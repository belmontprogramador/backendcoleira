import 'dotenv/config'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../../../../infrastructure/database/prisma.service'
import { PrismaWebhookEventRepository } from '../prisma-webhook-event.repository'
import { WebhookEvent } from '../../../domain/entities/webhook-event.entity'

describe('WebhookEvent — repositório (integração)', () => {
  let prisma: PrismaService
  let repo: PrismaWebhookEventRepository

  const config = {
    getOrThrow: (key: string) => {
      const map: Record<string, string> = {
        DATABASE_URL: process.env.DATABASE_URL ?? '',
      }
      return map[key]
    },
  } as unknown as ConfigService

  beforeAll(() => {
    prisma = new PrismaService(config)
    repo = new PrismaWebhookEventRepository(prisma)
  })

  afterAll(async () => {
    await prisma.webhookEvent.deleteMany()
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    await prisma.webhookEvent.deleteMany()
  })

  it('save persiste e findByProviderEventId recupera', async () => {
    const event = WebhookEvent.create({
      id: 'evt-1',
      provider: 'MERCADO_PAGO',
      eventId: 'mp-evt-123',
      eventType: 'payment.updated',
      payload: { status: 'approved' },
    })

    await repo.save(event)
    const found = await repo.findByProviderEventId('MERCADO_PAGO', 'mp-evt-123')

    expect(found?.id).toBe('evt-1')
    expect(found?.eventId).toBe('mp-evt-123')
    expect(found?.status).toBe('RECEIVED')
  })

  it('findByProviderEventId retorna null quando não existe', async () => {
    expect(await repo.findByProviderEventId('MERCADO_PAGO', 'x')).toBeNull()
  })

  it('save atualiza evento existente (upsert)', async () => {
    const event = WebhookEvent.create({
      id: 'evt-1',
      provider: 'MERCADO_PAGO',
      eventId: 'mp-evt-123',
      eventType: 'payment.updated',
      payload: { status: 'approved' },
    })
    await repo.save(event)

    event.markProcessed()
    await repo.save(event)

    const found = await repo.findByProviderEventId('MERCADO_PAGO', 'mp-evt-123')
    expect(found?.status).toBe('PROCESSED')
    expect(found?.processedAt).not.toBeNull()
  })
})
