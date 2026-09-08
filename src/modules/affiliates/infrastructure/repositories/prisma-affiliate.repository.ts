import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../../infrastructure/database/prisma.service'
import { Prisma } from '../../../../generated/prisma/client'
import type { Affiliate } from '../../domain/entities/affiliate.entity'
import type {
  AffiliateRepositoryPort,
  ListAffiliatesFilter,
} from '../../domain/repositories/affiliate.repository.port'
import { AffiliateMapper } from '../mappers/affiliate.mapper'

/**
 * Implementação concreta do `AffiliateRepositoryPort` usando Prisma 7.
 */
@Injectable()
export class PrismaAffiliateRepository implements AffiliateRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async save(affiliate: Affiliate): Promise<Affiliate> {
    const data = AffiliateMapper.toPersistence(affiliate)
    const model = await this.prisma.affiliate.upsert({
      where: { id: affiliate.id },
      create: data,
      update: data,
    })
    return AffiliateMapper.toDomain(model)
  }

  async findById(id: string): Promise<Affiliate | null> {
    const model = await this.prisma.affiliate.findUnique({ where: { id } })
    return model ? AffiliateMapper.toDomain(model) : null
  }

  async findByUserId(userId: string): Promise<Affiliate | null> {
    const model = await this.prisma.affiliate.findUnique({
      where: { user_id: userId },
    })
    return model ? AffiliateMapper.toDomain(model) : null
  }

  async findByCode(code: string): Promise<Affiliate | null> {
    const model = await this.prisma.affiliate.findUnique({ where: { code } })
    return model ? AffiliateMapper.toDomain(model) : null
  }

  async findByEmail(email: string): Promise<Affiliate | null> {
    const model = await this.prisma.affiliate.findUnique({
      where: { email: email.toLowerCase() },
    })
    return model ? AffiliateMapper.toDomain(model) : null
  }

  async list(filter: ListAffiliatesFilter): Promise<Affiliate[]> {
    const models = await this.prisma.affiliate.findMany({
      where: this.buildWhere(filter),
      skip: (filter.page - 1) * filter.limit,
      take: filter.limit,
      orderBy: { created_at: 'desc' },
    })
    return models.map(AffiliateMapper.toDomain)
  }

  async count(filter: ListAffiliatesFilter): Promise<number> {
    return this.prisma.affiliate.count({ where: this.buildWhere(filter) })
  }

  private buildWhere(
    filter: ListAffiliatesFilter,
  ): Prisma.AffiliateWhereInput | undefined {
    const conditions: Prisma.AffiliateWhereInput[] = []

    if (filter.status) {
      conditions.push({ status: filter.status })
    }
    if (filter.search) {
      const term = filter.search.trim()
      if (term.length > 0) {
        conditions.push({
          OR: [
            { name: { contains: term } },
            { email: { contains: term } },
            { code: { contains: term } },
          ],
        })
      }
    }

    return conditions.length > 0 ? { AND: conditions } : undefined
  }
}
