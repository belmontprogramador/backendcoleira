/**
 * Porta de validação de assinatura de webhook de pagamento.
 *
 * Implementação real (formato atual do Mercado Pago): HMAC-SHA256 sobre o
 * manifesto `id:<data.id>;request-id:<x-request-id>;ts:<ts>;` e comparação com
 * a parte `v1` do header `x-signature` (formato `ts=...,v1=...`).
 */
export interface PaymentWebhookValidatorPort {
  validate(
    headers: Record<string, string | string[] | undefined>,
    dataId: string,
  ): boolean
}

export const PAYMENT_WEBHOOK_VALIDATOR_PORT = Symbol(
  'PAYMENT_WEBHOOK_VALIDATOR_PORT',
)
