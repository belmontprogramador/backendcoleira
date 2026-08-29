import type { Plan } from '../../domain/entities/plan.entity'
import type { Feature } from '../../domain/entities/feature.entity'
import type { PriceCurrency } from '../../../../common/value-objects/price.vo'
import type { PlanInterval } from '../../domain/value-objects/plan-interval.vo'

export interface PlanFeatureResponse {
  code: string
  name: string
}

export interface PlanResponse {
  id: string
  code: string
  name: string
  description: string | null
  priceCents: number
  currency: PriceCurrency
  interval: PlanInterval
  intervalCount: number
  isDefault: boolean
  features: PlanFeatureResponse[]
}

/**
 * Mapeia `Plan` + suas `Feature`s para o formato de resposta HTTP (camelCase).
 */
export class PlanResponseMapper {
  static toResponse(plan: Plan, features: Feature[]): PlanResponse {
    return {
      id: plan.id,
      code: plan.code,
      name: plan.name,
      description: plan.description,
      priceCents: plan.price.amountInCents,
      currency: plan.price.currency,
      interval: plan.interval,
      intervalCount: plan.intervalCount,
      isDefault: plan.isDefault,
      features: features.map(f => ({ code: f.code, name: f.name })),
    }
  }
}
