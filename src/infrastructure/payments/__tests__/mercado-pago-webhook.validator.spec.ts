import { createHmac } from 'node:crypto'
import { ConfigService } from '@nestjs/config'
import { MercadoPagoWebhookValidator } from '../mercado-pago-webhook.validator'

describe('MercadoPagoWebhookValidator', () => {
  const secret = 'test-webhook-secret'

  function makeConfig(value: string | undefined): ConfigService {
    return {
      get: () => value,
    } as unknown as ConfigService
  }

  // Formato atual do Mercado Pago: x-signature = `ts=<ts>,v1=<hmac>`.
  function sign(dataId: string, requestId: string, ts: string): string {
    const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`
    const v1 = createHmac('sha256', secret).update(manifest).digest('hex')
    return `ts=${ts},v1=${v1}`
  }

  it('valida assinatura correta (manifesto completo)', () => {
    const validator = new MercadoPagoWebhookValidator(makeConfig(secret))
    const headers = {
      'x-signature': sign('mp-123', 'req-1', '1704908010'),
      'x-request-id': 'req-1',
    }
    expect(validator.validate(headers, 'mp-123')).toBe(true)
  })

  it('converte data.id para minúsculas no manifesto', () => {
    const validator = new MercadoPagoWebhookValidator(makeConfig(secret))
    const ts = '1704908010'
    const manifest = `id:${'ORD01JQ4'.toLowerCase()};request-id:req-1;ts:${ts};`
    const v1 = createHmac('sha256', secret).update(manifest).digest('hex')
    const headers = {
      'x-signature': `ts=${ts},v1=${v1}`,
      'x-request-id': 'req-1',
    }
    expect(validator.validate(headers, 'ORD01JQ4')).toBe(true)
  })

  it('monta manifesto sem data.id quando ausente', () => {
    const validator = new MercadoPagoWebhookValidator(makeConfig(secret))
    const ts = '1704908010'
    const manifest = `request-id:req-1;ts:${ts};`
    const v1 = createHmac('sha256', secret).update(manifest).digest('hex')
    const headers = {
      'x-signature': `ts=${ts},v1=${v1}`,
      'x-request-id': 'req-1',
    }
    expect(validator.validate(headers, '')).toBe(true)
  })

  it('rejeita assinatura incorreta (v1 divergente)', () => {
    const validator = new MercadoPagoWebhookValidator(makeConfig(secret))
    const headers = {
      'x-signature': 'ts=1704908010,v1=deadbeef',
      'x-request-id': 'req-1',
    }
    expect(validator.validate(headers, 'mp-123')).toBe(false)
  })

  it('rejeita x-signature no formato antigo (HMAC do body)', () => {
    const validator = new MercadoPagoWebhookValidator(makeConfig(secret))
    const oldStyle = createHmac('sha256', secret)
      .update('{"status":"approved"}')
      .digest('hex')
    expect(validator.validate({ 'x-signature': oldStyle }, 'mp-123')).toBe(
      false,
    )
  })

  it('rejeita quando falta o header de assinatura', () => {
    const validator = new MercadoPagoWebhookValidator(makeConfig(secret))
    expect(validator.validate({}, 'mp-123')).toBe(false)
  })

  it('rejeita (fail-closed) quando o secret não está configurado', () => {
    const validator = new MercadoPagoWebhookValidator(makeConfig(undefined))
    expect(validator.validate({}, 'mp-123')).toBe(false)
  })
})
