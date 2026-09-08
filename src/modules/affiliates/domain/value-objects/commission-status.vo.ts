export const COMMISSION_STATUS_VALUES = ['AVAILABLE', 'CANCELLED'] as const

export type CommissionStatus = (typeof COMMISSION_STATUS_VALUES)[number]

/**
 * Estado de uma comissão. Nasce `AVAILABLE` (disponível para saque) e pode ser
 * `CANCELLED` quando a venda/ciclo de origem é reembolsado/cancelado antes do
 * saque. O saldo disponível do afiliado considera apenas `AVAILABLE`.
 */
export function isCommissionStatus(value: string): value is CommissionStatus {
  return (COMMISSION_STATUS_VALUES as readonly string[]).includes(value)
}
