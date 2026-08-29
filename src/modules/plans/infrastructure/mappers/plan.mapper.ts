import { Plan } from '../../domain/entities/plan.entity'
import { Price } from '../../../../common/value-objects/price.vo'
import type { PriceCurrency } from '../../../../common/value-objects/price.vo'
import type { PlanInterval } from '../../domain/value-objects/plan-interval.vo'
import type { PlanModel } from '../../../../generated/prisma/models/Plan'

/**
 * Converte a entidade `Plan` (domínio) para o formato de persistência Prisma
 * (snake_case) e vice-versa.
 */
export class PlanMapper {
  static toPersistence(plan: Plan): {
    id: string
    code: string
    name: string
    description: string | null
    price_cents: number
    currency: string
    interval: PlanInterval
    interval_count: number
    is_default: boolean
    created_at: Date
    updated_at: Date
  } {
    return {
      id: plan.id,
      code: plan.code,
      name: plan.name,
      description: plan.description,
      price_cents: plan.price.amountInCents,
      currency: plan.price.currency,
      interval: plan.interval,
      interval_count: plan.intervalCount,
      is_default: plan.isDefault,
      created_at: plan.createdAt,
      updated_at: plan.updatedAt,
    }
  }

  static toDomain(model: PlanModel): Plan {
    return Plan.reconstitute({
      id: model.id,
      code: model.code,
      name: model.name,
      description: model.description,
      price: Price.create(model.price_cents, model.currency as PriceCurrency),
      interval: model.interval,
      intervalCount: model.interval_count,
      isDefault: model.is_default,
      createdAt: model.created_at,
      updatedAt: model.updated_at,
    })
  }
}
