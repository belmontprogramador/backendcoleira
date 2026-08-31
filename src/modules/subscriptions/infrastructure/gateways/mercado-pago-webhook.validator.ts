import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createHmac, timingSafeEqual } from 'node:crypto'
import type { PaymentWebhookValidatorPort } from '../../domain/gateways/payment-webhook-validator.port'

/**
 * Implementação do `PaymentWebhookValidatorPort` (HMAC-SHA256, formato atual do MP).
 *
 * O header `x-signature` chega como `ts=<timestamp>,v1=<hmac>`. A validação calcula
 * HMAC-SHA256 (hex) do manifesto:
 *
 *   `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`
 *
 * e compara (timing-safe) com `v1`.
 *
 * - `data.id` é o query param da URL (convertido para minúsculas).
 * - `x-request-id` é header; se ausente, é removido do manifesto.
 * - Fail-closed: sem segredo configurado, rejeita sempre.
 */
@Injectable()
export class MercadoPagoWebhookValidator implements PaymentWebhookValidatorPort {
  private readonly logger = new Logger(MercadoPagoWebhookValidator.name)

  constructor(private readonly config: ConfigService) {}

  validate(
    headers: Record<string, string | string[] | undefined>,
    dataId: string,
  ): boolean {
    const secret = this.config.get<string>('MERCADO_PAGO_WEBHOOK_SECRET')
    if (!secret || secret.length === 0) {
      this.logger.error(
        'MERCADO_PAGO_WEBHOOK_SECRET não configurado — rejeitando webhook (fail-closed)',
      )
      return false
    }

    const signatureHeader = headers['x-signature']
    if (typeof signatureHeader !== 'string' || signatureHeader.length === 0) {
      this.logger.warn('Webhook rejeitado: header x-signature ausente')
      return false
    }

    const { ts, v1 } = this.parseSignature(signatureHeader)
    if (!ts || !v1) {
      this.logger.warn(
        'Webhook rejeitado: x-signature fora do formato ts=...,v1=...',
      )
      return false
    }

    const requestId = headers['x-request-id']
    const requestIdStr = typeof requestId === 'string' ? requestId : ''

    const manifest = this.buildManifest(dataId, requestIdStr, ts)
    const computed = createHmac('sha256', secret).update(manifest).digest('hex')

    const a = Buffer.from(computed, 'utf8')
    const b = Buffer.from(v1, 'utf8')
    if (a.length !== b.length) {
      this.logger.warn(
        `Webhook rejeitado: tamanho da assinatura difere (v1=${b.length}, calculada=${a.length})`,
      )
      return false
    }
    const valid = timingSafeEqual(a, b)
    if (!valid) {
      this.logger.warn(
        `Webhook rejeitado: assinatura não confere (secret=${secret.length} chars, ` +
          `v1=${v1.slice(0, 12)}…, calculada=${computed.slice(0, 12)}…, ` +
          `manifest=${manifest})`,
      )
    }
    return valid
  }

  private parseSignature(header: string): { ts: string; v1: string } {
    let ts = ''
    let v1 = ''
    for (const part of header.split(',')) {
      const eq = part.indexOf('=')
      if (eq === -1) continue
      const key = part.slice(0, eq).trim()
      const value = part.slice(eq + 1).trim()
      if (key === 'ts') ts = value
      else if (key === 'v1') v1 = value
    }
    return { ts, v1 }
  }

  private buildManifest(dataId: string, requestId: string, ts: string): string {
    let manifest = ''
    if (dataId) manifest += `id:${dataId.toLowerCase()};`
    if (requestId) manifest += `request-id:${requestId};`
    manifest += `ts:${ts};`
    return manifest
  }
}
