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

  function sign(rawBody: string): string {
    return createHmac('sha256', secret).update(rawBody).digest('hex')
  }

  it('valida assinatura correta', () => {
    const validator = new MercadoPagoWebhookValidator(makeConfig(secret))
    const rawBody = '{"status":"approved"}'
    expect(validator.validate({ 'x-signature': sign(rawBody) }, rawBody)).toBe(
      true,
    )
  })

  it('rejeita assinatura incorreta', () => {
    const validator = new MercadoPagoWebhookValidator(makeConfig(secret))
    expect(validator.validate({ 'x-signature': 'wrong' }, 'body')).toBe(false)
  })

  it('rejeita quando falta o header de assinatura', () => {
    const validator = new MercadoPagoWebhookValidator(makeConfig(secret))
    expect(validator.validate({}, 'body')).toBe(false)
  })

  it('rejeita (fail-closed) quando o secret não está configurado', () => {
    const validator = new MercadoPagoWebhookValidator(makeConfig(undefined))
    expect(validator.validate({}, 'body')).toBe(false)
  })
})
