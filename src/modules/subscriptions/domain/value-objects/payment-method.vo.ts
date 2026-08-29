export const PAYMENT_METHOD_VALUES = ['PIX', 'CARD', 'BOLETO'] as const

export type PaymentMethod = (typeof PAYMENT_METHOD_VALUES)[number]

/**
 * Meio de pagamento do checkout próprio (espelha o enum `PaymentMethod`).
 */
export function isPaymentMethod(value: string): value is PaymentMethod {
  return (PAYMENT_METHOD_VALUES as readonly string[]).includes(value)
}
