export const PAYMENT_PROVIDER_VALUES = ['MERCADO_PAGO'] as const

export type PaymentProvider = (typeof PAYMENT_PROVIDER_VALUES)[number]

/**
 * Provedor de pagamento (espelha o enum `PaymentProvider`). Começa com
 * `MERCADO_PAGO`; novos provedores são adicionados aqui (multi-provider).
 */
export function isPaymentProvider(value: string): value is PaymentProvider {
  return (PAYMENT_PROVIDER_VALUES as readonly string[]).includes(value)
}
