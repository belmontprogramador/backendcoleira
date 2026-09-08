export const COMMISSION_SOURCE_VALUES = ['ORDER', 'SUBSCRIPTION'] as const

export type CommissionSource = (typeof COMMISSION_SOURCE_VALUES)[number]

/**
 * Origem da comissão: venda de pingente (`ORDER`) ou ciclo de assinatura
 * (`SUBSCRIPTION`). Determina qual FK (`order_id`/`subscription_id`) é usada.
 */
export function isCommissionSource(value: string): value is CommissionSource {
  return (COMMISSION_SOURCE_VALUES as readonly string[]).includes(value)
}
