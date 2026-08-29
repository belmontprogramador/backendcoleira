import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../../infrastructure/database/prisma.service'
import type { Plan } from '../../domain/entities/plan.entity'
import type { PlanRepositoryPort } from '../../domain/repositories/plan.repository.port'
import { PlanMapper } from '../mappers/plan.mapper'

/**
 * Implementação concreta do `PlanRepositoryPort` usando Prisma 7.
 */
@Injectable()
export class PrismaPlanRepository implements PlanRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Plan[]> {
    const models = await this.prisma.plan.findMany({
      orderBy: { price_cents: 'asc' },
    })
    return models.map(PlanMapper.toDomain)
  }

  async findById(id: string): Promise<Plan | null> {
    const model = await this.prisma.plan.findUnique({ where: { id } })
    return model ? PlanMapper.toDomain(model) : null
  }

  async findByCode(code: string): Promise<Plan | null> {
    const model = await this.prisma.plan.findUnique({ where: { code } })
    return model ? PlanMapper.toDomain(model) : null
  }

  async findDefault(): Promise<Plan | null> {
    const model = await this.prisma.plan.findFirst({
      where: { is_default: true },
    })
    return model ? PlanMapper.toDomain(model) : null
  }
}
