import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createHmac, timingSafeEqual } from 'node:crypto'
import type { PaymentWebhookValidatorPort } from '../../domain/gateways/payment-webhook-validator.port'

/**
 * Implementação do `PaymentWebhookValidatorPort` (HMAC-SHA256).
 *
 * Calcula o HMAC-SHA256 do corpo bruto com `MERCADO_PAGO_WEBHOOK_SECRET` e
 * compara (timing-safe) com o header `X-Signature`.
 *
 * Fail-closed: sem segredo configurado, a assinatura é SEMPRE rejeitada.
 */
@Injectable()
export class MercadoPagoWebhookValidator implements PaymentWebhookValidatorPort {
  private readonly logger = new Logger(MercadoPagoWebhookValidator.name)

  constructor(private readonly config: ConfigService) {}

  validate(
    headers: Record<string, string | string[] | undefined>,
    rawBody: string,
  ): boolean {
    const secret = this.config.get<string>('MERCADO_PAGO_WEBHOOK_SECRET')
    if (!secret || secret.length === 0) {
      this.logger.error(
        'MERCADO_PAGO_WEBHOOK_SECRET não configurado — rejeitando webhook (fail-closed)',
      )
      return false
    }

    const signature = headers['x-signature']
    if (typeof signature !== 'string' || signature.length === 0) {
      return false
    }

    const computed = createHmac('sha256', secret).update(rawBody).digest('hex')
    const a = Buffer.from(computed, 'utf8')
    const b = Buffer.from(signature, 'utf8')
    if (a.length !== b.length) {
      return false
    }
    return timingSafeEqual(a, b)
  }
}
