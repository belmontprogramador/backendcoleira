import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../../infrastructure/database/prisma.service'
import type { WebhookEvent } from '../../domain/entities/webhook-event.entity'
import type { PaymentProvider } from '../../domain/value-objects/payment-provider.vo'
import type { WebhookEventRepositoryPort } from '../../domain/repositories/webhook-event.repository.port'
import { WebhookEventMapper } from '../mappers/webhook-event.mapper'

/**
 * Implementação concreta do `WebhookEventRepositoryPort` usando Prisma 7.
 */
@Injectable()
export class PrismaWebhookEventRepository implements WebhookEventRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async save(event: WebhookEvent): Promise<void> {
    const data = WebhookEventMapper.toPersistence(event)
    await this.prisma.webhookEvent.upsert({
      where: { id: event.id },
      create: data,
      update: data,
    })
  }

  async findByProviderEventId(
    provider: PaymentProvider,
    eventId: string,
  ): Promise<WebhookEvent | null> {
    const model = await this.prisma.webhookEvent.findUnique({
      where: {
        provider_event_id: { provider, event_id: eventId },
      },
    })
    return model ? WebhookEventMapper.toDomain(model) : null
  }
}
