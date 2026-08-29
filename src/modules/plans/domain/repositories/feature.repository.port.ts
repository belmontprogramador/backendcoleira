import type { Feature } from '../entities/feature.entity'

/**
 * Porta do repositório de features (Feature System).
 */
export interface FeatureRepositoryPort {
  findByCode(code: string): Promise<Feature | null>
  findByPlanId(planId: string): Promise<Feature[]>
}

export const FEATURE_REPOSITORY_PORT = Symbol('FEATURE_REPOSITORY_PORT')
