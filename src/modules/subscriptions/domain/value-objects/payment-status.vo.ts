export const PAYMENT_STATUS_VALUES = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'REFUNDED',
  'CHARGED_BACK',
] as const

export type PaymentStatus = (typeof PAYMENT_STATUS_VALUES)[number]

/**
 * Estado de uma transação de pagamento (espelha o enum `PaymentStatus`).
 */
export function isPaymentStatus(value: string): value is PaymentStatus {
  return (PAYMENT_STATUS_VALUES as readonly string[]).includes(value)
}
