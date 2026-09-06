import { createHmac } from 'node:crypto'
import type { ConfigService } from '@nestjs/config'
import { MelhorEnvioWebhookValidator } from '../melhor-envio-webhook.validator'

const SECRET = 'segredo-webhook'

function sign(body: string): string {
  // A Melhor Envio assina em base64 (não hex).
  return createHmac('sha256', SECRET).update(body).digest('base64')
}

function makeConfig(secret?: string): ConfigService {
  return {
    get: (key: string) =>
      key === 'MELHOR_ENVIO_CLIENT_SECRET' ? secret : undefined,
  } as unknown as ConfigService
}

describe('MelhorEnvioWebhookValidator', () => {
  const body = JSON.stringify({ event: 'order.delivered', data: {} })

  it('valida assinatura correta (base64)', () => {
    const validator = new MelhorEnvioWebhookValidator(makeConfig(SECRET))
    expect(validator.validate(body, sign(body))).toBe(true)
  })

  it('rejeita assinatura incorreta', () => {
    const validator = new MelhorEnvioWebhookValidator(makeConfig(SECRET))
    expect(validator.validate(body, 'c2lnbmF0dXJlLWludmFsaWRh')).toBe(false)
  })

  it('rejeita corpo adulterado (assinatura de outro body)', () => {
    const validator = new MelhorEnvioWebhookValidator(makeConfig(SECRET))
    expect(validator.validate('{"event":"order.cancelled"}', sign(body))).toBe(
      false,
    )
  })

  it('fail-closed sem segredo configurado', () => {
    const validator = new MelhorEnvioWebhookValidator(makeConfig(undefined))
    expect(validator.validate(body, sign(body))).toBe(false)
  })

  it('rejeita assinatura vazia', () => {
    const validator = new MelhorEnvioWebhookValidator(makeConfig(SECRET))
    expect(validator.validate(body, '')).toBe(false)
  })
})
