import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../../infrastructure/database/prisma.service'
import type { Commission } from '../../domain/entities/commission.entity'
import type {
  CommissionAggregate,
  CommissionRepositoryPort,
} from '../../domain/repositories/commission.repository.port'
import { CommissionMapper } from '../mappers/commission.mapper'

/**
 * Implementação concreta do `CommissionRepositoryPort` usando Prisma 7.
 */
@Injectable()
export class PrismaCommissionRepository implements CommissionRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async save(commission: Commission): Promise<Commission> {
    const data = CommissionMapper.toPersistence(commission)
    const model = await this.prisma.commission.upsert({
      where: { id: commission.id },
      create: data,
      update: data,
    })
    return CommissionMapper.toDomain(model)
  }

  async findByOrderId(orderId: string): Promise<Commission | null> {
    const model = await this.prisma.commission.findFirst({
      where: { order_id: orderId },
    })
    return model ? CommissionMapper.toDomain(model) : null
  }

  async findBySubscriptionId(
    subscriptionId: string,
  ): Promise<Commission | null> {
    const model = await this.prisma.commission.findFirst({
      where: { subscription_id: subscriptionId },
    })
    return model ? CommissionMapper.toDomain(model) : null
  }

  async sumAvailableByAffiliateId(affiliateId: string): Promise<number> {
    const agg = await this.prisma.commission.aggregate({
      where: { affiliate_id: affiliateId, status: 'AVAILABLE' },
      _sum: { amount_cents: true },
    })
    return agg._sum.amount_cents ?? 0
  }

  async aggregateByAffiliateId(
    affiliateId: string,
  ): Promise<CommissionAggregate> {
    const where = { affiliate_id: affiliateId }
    const [sales, subscriptions, available] = await Promise.all([
      this.prisma.commission.aggregate({
        where: { ...where, source: 'ORDER' },
        _count: { _all: true },
        _sum: { base_amount_cents: true, amount_cents: true },
      }),
      this.prisma.commission.aggregate({
        where: { ...where, source: 'SUBSCRIPTION' },
        _count: { _all: true },
        _sum: { base_amount_cents: true, amount_cents: true },
      }),
      this.prisma.commission.aggregate({
        where: { ...where, status: 'AVAILABLE' },
        _sum: { amount_cents: true },
      }),
    ])

    return {
      sales: {
        count: sales._count._all,
        revenueCents: sales._sum.base_amount_cents ?? 0,
        commissionCents: sales._sum.amount_cents ?? 0,
      },
      subscriptions: {
        count: subscriptions._count._all,
        revenueCents: subscriptions._sum.base_amount_cents ?? 0,
        commissionCents: subscriptions._sum.amount_cents ?? 0,
      },
      availableCents: available._sum.amount_cents ?? 0,
    }
  }
}
