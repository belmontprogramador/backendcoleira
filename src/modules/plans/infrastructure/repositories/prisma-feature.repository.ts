import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../../infrastructure/database/prisma.service'
import type { Feature } from '../../domain/entities/feature.entity'
import type { FeatureRepositoryPort } from '../../domain/repositories/feature.repository.port'
import { FeatureMapper } from '../mappers/feature.mapper'

/**
 * Implementação concreta do `FeatureRepositoryPort` usando Prisma 7.
 * A relação plan↔feature é resolvida via tabela de junção `PlanFeature`.
 */
@Injectable()
export class PrismaFeatureRepository implements FeatureRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findByCode(code: string): Promise<Feature | null> {
    const model = await this.prisma.feature.findUnique({ where: { code } })
    return model ? FeatureMapper.toDomain(model) : null
  }

  async findByPlanId(planId: string): Promise<Feature[]> {
    const planFeatures = await this.prisma.planFeature.findMany({
      where: { plan_id: planId },
      include: { feature: true },
      orderBy: { created_at: 'asc' },
    })
    return planFeatures.map(pf => FeatureMapper.toDomain(pf.feature))
  }
}
