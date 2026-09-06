import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createHmac, timingSafeEqual } from 'node:crypto'
import type { ShippingWebhookValidatorPort } from './shipping-webhook-validator.port'

/**
 * Implementação do `ShippingWebhookValidatorPort` (webhook Melhor Envio).
 *
 * O header `X-ME-Signature` contém `HMAC-SHA256(body_cru, app_secret)` em
 * **base64** — a ME assina com o próprio secret do aplicativo (que é o
 * `MELHOR_ENVIO_CLIENT_SECRET`, não um segredo separado de webhook).
 *
 * A validação recalcula o HMAC do corpo cru (string JSON, exata como chegou) e
 * compara (timing-safe) com a assinatura recebida.
 *
 * - Fail-closed: sem `MELHOR_ENVIO_CLIENT_SECRET`, rejeita sempre.
 */
@Injectable()
export class MelhorEnvioWebhookValidator
  implements ShippingWebhookValidatorPort
{
  private readonly logger = new Logger(MelhorEnvioWebhookValidator.name)

  constructor(private readonly config: ConfigService) {}

  validate(body: string, signature: string): boolean {
    const secret = this.config.get<string>('MELHOR_ENVIO_CLIENT_SECRET')
    if (!secret || secret.length === 0) {
      this.logger.error(
        'MELHOR_ENVIO_CLIENT_SECRET não configurado — rejeitando webhook (fail-closed)',
      )
      return false
    }

    if (typeof signature !== 'string' || signature.length === 0) {
      this.logger.warn('Webhook rejeitado: X-ME-Signature ausente')
      return false
    }

    // A Melhor Envio envia a assinatura em base64 (não hex).
    const computed = createHmac('sha256', secret).update(body).digest('base64')
    const a = Buffer.from(computed, 'utf8')
    const b = Buffer.from(signature, 'utf8')
    if (a.length !== b.length) {
      this.logger.warn(
        `Webhook rejeitado: tamanho da assinatura difere (header=${b.length}, calculada=${a.length})`,
      )
      return false
    }

    const valid = timingSafeEqual(a, b)
    if (!valid) {
      this.logger.warn('Webhook rejeitado: assinatura não confere')
    }
    return valid
  }
}
