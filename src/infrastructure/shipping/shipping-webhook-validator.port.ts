/**
 * Porta de validação de assinatura de webhook da Melhor Envio.
 * A ME envia o header `X-ME-Signature` = HMAC-SHA256 (base64) do corpo cru
 * (JSON) usando o secret do aplicativo (`MELHOR_ENVIO_CLIENT_SECRET`).
 */
export interface ShippingWebhookValidatorPort {
  validate(body: string, signature: string): boolean
}

export const SHIPPING_WEBHOOK_VALIDATOR_PORT = Symbol(
  'SHIPPING_WEBHOOK_VALIDATOR_PORT',
)
