import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../../infrastructure/database/prisma.service'
import { Prisma } from '../../../../generated/prisma/client'
import type { SubscriptionStatus } from '../../../../generated/prisma/enums'
import type { Subscription } from '../../domain/entities/subscription.entity'
import type {
  ListSubscriptionsFilter,
  SubscriptionRepositoryPort,
} from '../../domain/repositories/subscription.repository.port'
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

  async list(filter: ListSubscriptionsFilter): Promise<Subscription[]> {
    const models = await this.prisma.subscription.findMany({
      where: this.buildWhere(filter),
      skip: (filter.page - 1) * filter.limit,
      take: filter.limit,
      orderBy: { created_at: 'desc' },
    })
    return models.map(SubscriptionMapper.toDomain)
  }

  async count(filter: ListSubscriptionsFilter): Promise<number> {
    return this.prisma.subscription.count({
      where: this.buildWhere(filter),
    })
  }

  private buildWhere(
    filter: ListSubscriptionsFilter,
  ): Prisma.SubscriptionWhereInput | undefined {
    const conditions: Prisma.SubscriptionWhereInput[] = []

    if (filter.status) {
      conditions.push({ status: filter.status as SubscriptionStatus })
    }
    if (filter.planCode) {
      conditions.push({ plan: { code: filter.planCode } })
    }
    if (filter.userId) {
      conditions.push({ user_id: filter.userId })
    }

    return conditions.length > 0 ? { AND: conditions } : undefined
  }
}
