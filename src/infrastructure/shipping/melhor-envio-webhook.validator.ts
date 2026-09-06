import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createHmac, timingSafeEqual } from 'node:crypto'
import type { ShippingWebhookValidatorPort } from './shipping-webhook-validator.port'

/**
 * Implementação do `ShippingWebhookValidatorPort` (webhook Melhor Envio).
 *
 * O header `X-ME-Signature` contém `HMAC-SHA256(body_cru, app_secret)` em hex.
 * A validação recalcula o HMAC do corpo cru (string JSON, exata como chegou) e
 * compara (timing-safe) com a assinatura.
 *
 * - Fail-closed: sem segredo configurado, rejeita sempre.
 * - A assinatura esperada é hex; se a ME passar base64, trocar `.digest('hex')`
 *   por `.digest('base64')`.
 */
@Injectable()
export class MelhorEnvioWebhookValidator
  implements ShippingWebhookValidatorPort
{
  private readonly logger = new Logger(MelhorEnvioWebhookValidator.name)

  constructor(private readonly config: ConfigService) {}

  validate(body: string, signature: string): boolean {
    const secret = this.config.get<string>('MELHOR_ENVIO_WEBHOOK_SECRET')
    if (!secret || secret.length === 0) {
      this.logger.error(
        'MELHOR_ENVIO_WEBHOOK_SECRET não configurado — rejeitando webhook (fail-closed)',
      )
      return false
    }

    if (typeof signature !== 'string' || signature.length === 0) {
      this.logger.warn('Webhook rejeitado: X-ME-Signature ausente')
      return false
    }

    const computed = createHmac('sha256', secret).update(body).digest('hex')
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
