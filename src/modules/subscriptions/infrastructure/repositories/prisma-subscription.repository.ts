import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../../infrastructure/database/prisma.service'
import type { Subscription } from '../../domain/entities/subscription.entity'
import type { SubscriptionRepositoryPort } from '../../domain/repositories/subscription.repository.port'
import { SubscriptionMapper } from '../mappers/subscription.mapper'

/**
 * Implementação concreta do `SubscriptionRepositoryPort` usando Prisma 7.
 */
@Injectable()
export class PrismaSubscriptionRepository implements SubscriptionRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async save(subscription: Subscription): Promise<void> {
    const data = SubscriptionMapper.toPersistence(subscription)
    await this.prisma.subscription.upsert({
      where: { id: subscription.id },
      create: data,
      update: data,
    })
  }

  async findById(id: string): Promise<Subscription | null> {
    const model = await this.prisma.subscription.findUnique({ where: { id } })
    return model ? SubscriptionMapper.toDomain(model) : null
  }

  async findByUserId(userId: string): Promise<Subscription | null> {
    const model = await this.prisma.subscription.findFirst({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    })
    return model ? SubscriptionMapper.toDomain(model) : null
  }

  async findActiveByUserId(userId: string): Promise<Subscription | null> {
    const model = await this.prisma.subscription.findFirst({
      where: {
        user_id: userId,
        status: { in: ['ACTIVE', 'TRIALING'] },
      },
      orderBy: { current_period_end: 'desc' },
    })
    return model ? SubscriptionMapper.toDomain(model) : null
  }
}
