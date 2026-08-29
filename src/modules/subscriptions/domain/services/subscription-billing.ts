import type { PlanInterval } from '../../../plans/domain/value-objects/plan-interval.vo'
import { SubscriptionPeriod } from '../value-objects/subscription-period.vo'

/**
 * Soma a duração do plano (intervalo × quantidade) a uma data base.
 */
export function addPlanInterval(
  from: Date,
  interval: PlanInterval,
  count: number,
): Date {
  const end = new Date(from)
  if (interval === 'MONTHLY') {
    end.setUTCMonth(end.getUTCMonth() + count)
  } else {
    end.setUTCFullYear(end.getUTCFullYear() + count)
  }
  return end
}

/**
 * Calcula o próximo período de vigência (RF22): se há um fim anterior no
 * futuro, estende a partir dele (renovação); senão, recomeça de `now`.
 */
export function nextPeriod(
  now: Date,
  previousEnd: Date | null,
  interval: PlanInterval,
  count: number,
): SubscriptionPeriod {
  const start =
    previousEnd && previousEnd.getTime() > now.getTime() ? previousEnd : now
  const end = addPlanInterval(start, interval, count)
  return SubscriptionPeriod.create(start, end)
}
