import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../../infrastructure/database/prisma.service'
import { Prisma } from '../../../../generated/prisma/client'
import type { Withdrawal } from '../../domain/entities/withdrawal.entity'
import type {
  ListWithdrawalsFilter,
  WithdrawalRepositoryPort,
} from '../../domain/repositories/withdrawal.repository.port'
import { WithdrawalMapper } from '../mappers/withdrawal.mapper'

/**
 * Implementação concreta do `WithdrawalRepositoryPort` usando Prisma 7.
 */
@Injectable()
export class PrismaWithdrawalRepository implements WithdrawalRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async save(withdrawal: Withdrawal): Promise<Withdrawal> {
    const data = WithdrawalMapper.toPersistence(withdrawal)
    const model = await this.prisma.withdrawal.upsert({
      where: { id: withdrawal.id },
      create: data,
      update: data,
    })
    return WithdrawalMapper.toDomain(model)
  }

  async findById(id: string): Promise<Withdrawal | null> {
    const model = await this.prisma.withdrawal.findUnique({ where: { id } })
    return model ? WithdrawalMapper.toDomain(model) : null
  }

  async listByAffiliateId(affiliateId: string): Promise<Withdrawal[]> {
    const models = await this.prisma.withdrawal.findMany({
      where: { affiliate_id: affiliateId },
      orderBy: { requested_at: 'desc' },
    })
    return models.map(WithdrawalMapper.toDomain)
  }

  async list(filter: ListWithdrawalsFilter): Promise<Withdrawal[]> {
    const models = await this.prisma.withdrawal.findMany({
      where: this.buildWhere(filter),
      skip: (filter.page - 1) * filter.limit,
      take: filter.limit,
      orderBy: { requested_at: 'desc' },
    })
    return models.map(WithdrawalMapper.toDomain)
  }

  async count(filter: ListWithdrawalsFilter): Promise<number> {
    return this.prisma.withdrawal.count({ where: this.buildWhere(filter) })
  }

  async sumActiveByAffiliateId(affiliateId: string): Promise<number> {
    const agg = await this.prisma.withdrawal.aggregate({
      where: {
        affiliate_id: affiliateId,
        status: { in: ['RECEIVED', 'PROCESSING', 'PAID'] },
      },
      _sum: { amount_cents: true },
    })
    return agg._sum.amount_cents ?? 0
  }

  async sumPaidByAffiliateId(affiliateId: string): Promise<number> {
    const agg = await this.prisma.withdrawal.aggregate({
      where: { affiliate_id: affiliateId, status: 'PAID' },
      _sum: { amount_cents: true },
    })
    return agg._sum.amount_cents ?? 0
  }

  private buildWhere(
    filter: ListWithdrawalsFilter,
  ): Prisma.WithdrawalWhereInput | undefined {
    const conditions: Prisma.WithdrawalWhereInput[] = []

    if (filter.status) {
      conditions.push({ status: filter.status })
    }
    if (filter.affiliateId) {
      conditions.push({ affiliate_id: filter.affiliateId })
    }

    return conditions.length > 0 ? { AND: conditions } : undefined
  }
}
