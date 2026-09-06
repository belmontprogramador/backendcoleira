/**
 * Porta de validação de assinatura de webhook da Melhor Envio.
 * A ME envia o header `X-ME-Signature` = HMAC-SHA256 do corpo cru (JSON)
 * usando o `MELHOR_ENVIO_WEBHOOK_SECRET` da app.
 */
export interface ShippingWebhookValidatorPort {
  validate(body: string, signature: string): boolean
}

export const SHIPPING_WEBHOOK_VALIDATOR_PORT = Symbol(
  'SHIPPING_WEBHOOK_VALIDATOR_PORT',
)
