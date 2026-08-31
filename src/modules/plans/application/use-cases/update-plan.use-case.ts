import { Inject, Injectable } from '@nestjs/common'
import { PLAN_REPOSITORY_PORT } from '../../domain/repositories/plan.repository.port'
import type { PlanRepositoryPort } from '../../domain/repositories/plan.repository.port'
import { FEATURE_REPOSITORY_PORT } from '../../domain/repositories/feature.repository.port'
import type { FeatureRepositoryPort } from '../../domain/repositories/feature.repository.port'
import type { Plan } from '../../domain/entities/plan.entity'
import type { Feature } from '../../domain/entities/feature.entity'
import { Price } from '../../../../common/value-objects/price.vo'
import { PlanNotFoundError } from '../errors'
import type { UpdatePlanDto } from '../dtos/update-plan.schema'

export interface PlanWithFeatures {
  plan: Plan
  features: Feature[]
}

/**
 * Caso de uso: atualizar um plano (nome, descrição e/ou preço).
 *
 * Apenas campos editáveis são mutados; `code`/`interval`/`intervalCount`
 * permanecem intactos (opção A — periodicidade travada). O preço em centavos
 * é validado via value object `Price`.
 */
@Injectable()
export class UpdatePlanUseCase {
  constructor(
    @Inject(PLAN_REPOSITORY_PORT)
    private readonly plans: PlanRepositoryPort,
    @Inject(FEATURE_REPOSITORY_PORT)
    private readonly features: FeatureRepositoryPort,
  ) {}

  async execute(id: string, dto: UpdatePlanDto): Promise<PlanWithFeatures> {
    const plan = await this.plans.findById(id)
    if (!plan) {
      throw new PlanNotFoundError()
    }

    plan.updateDetails({
      name: dto.name,
      description: dto.description,
      price:
        dto.priceCents !== undefined ? Price.create(dto.priceCents) : undefined,
    })

    const updated = await this.plans.update(plan)
    const features = await this.features.findByPlanId(updated.id)
    return { plan: updated, features }
  }
}
