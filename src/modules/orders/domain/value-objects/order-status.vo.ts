export const ORDER_STATUS_VALUES = [
  'PENDING',
  'PAID',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'REFUNDED',
] as const

export type OrderStatus = (typeof ORDER_STATUS_VALUES)[number]

/**
 * Status do ciclo de vida de uma venda (`Order`), desacoplado do `NfcTag`.
 * Fluxo normal: PENDING → PAID → SHIPPED → DELIVERED.
 * Terminais: CANCELLED (antes de pagar) e REFUNDED (estorno).
 */
export function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUS_VALUES as readonly string[]).includes(value)
}
