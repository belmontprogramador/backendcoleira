import { Inject, Injectable } from '@nestjs/common'
import { PLAN_REPOSITORY_PORT } from '../../domain/repositories/plan.repository.port'
import type { PlanRepositoryPort } from '../../domain/repositories/plan.repository.port'
import { FEATURE_REPOSITORY_PORT } from '../../domain/repositories/feature.repository.port'
import type { FeatureRepositoryPort } from '../../domain/repositories/feature.repository.port'
import type { Plan } from '../../domain/entities/plan.entity'
import type { Feature } from '../../domain/entities/feature.entity'

export interface PlanWithFeatures {
  plan: Plan
  features: Feature[]
}

/**
 * Caso de uso: listar planos disponíveis (Basic/Premium) com suas features.
 * Consumido por `GET /plans`.
 */
@Injectable()
export class ListPlansUseCase {
  constructor(
    @Inject(PLAN_REPOSITORY_PORT)
    private readonly plans: PlanRepositoryPort,
    @Inject(FEATURE_REPOSITORY_PORT)
    private readonly features: FeatureRepositoryPort,
  ) {}

  async execute(): Promise<PlanWithFeatures[]> {
    const plans = await this.plans.findAll()
    const result: PlanWithFeatures[] = []
    for (const plan of plans) {
      const features = await this.features.findByPlanId(plan.id)
      result.push({ plan, features })
    }
    return result
  }
}
