import type { Plan } from '../entities/plan.entity'

/**
 * Porta do repositório de planos (catálogo Basic/Premium).
 * DIP: domínio/aplicação dependem desta interface; a implementação (Prisma)
 * vive na infraestrutura.
 */
export interface PlanRepositoryPort {
  findAll(): Promise<Plan[]>
  findById(id: string): Promise<Plan | null>
  findByIds(ids: string[]): Promise<Plan[]>
  findByCode(code: string): Promise<Plan | null>
  findDefault(): Promise<Plan | null>
  update(plan: Plan): Promise<Plan>
}

export const PLAN_REPOSITORY_PORT = Symbol('PLAN_REPOSITORY_PORT')
