export const PLAN_INTERVAL_VALUES = ['MONTHLY', 'YEARLY'] as const

export type PlanInterval = (typeof PLAN_INTERVAL_VALUES)[number]

/**
 * Intervalo de cobrança do plano (espelha o enum `PlanInterval` do Prisma,
 * sem depender dele).
 */
export function isPlanInterval(value: string): value is PlanInterval {
  return (PLAN_INTERVAL_VALUES as readonly string[]).includes(value)
}
