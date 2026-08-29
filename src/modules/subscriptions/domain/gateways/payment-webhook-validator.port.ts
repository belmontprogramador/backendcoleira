/**
 * Porta de validação de assinatura de webhook de pagamento.
 * Implementação real: HMAC-SHA256 sobre o corpo bruto (header `X-Signature`),
 * como exige o Mercado Pago. `rawBody` é o corpo exato (bytes) enviado.
 */
export interface PaymentWebhookValidatorPort {
  validate(
    headers: Record<string, string | string[] | undefined>,
    rawBody: string,
  ): boolean
}

export const PAYMENT_WEBHOOK_VALIDATOR_PORT = Symbol(
  'PAYMENT_WEBHOOK_VALIDATOR_PORT',
)
