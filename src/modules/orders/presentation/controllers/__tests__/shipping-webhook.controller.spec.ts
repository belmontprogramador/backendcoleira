import { ShippingWebhookController } from '../shipping-webhook.controller'

describe('ShippingWebhookController', () => {
  const process = { execute: jest.fn().mockResolvedValue({ processed: true }) }
  const validator = { validate: jest.fn() }

  beforeEach(() => {
    process.execute.mockClear()
    validator.validate.mockClear()
  })

  function makeController() {
    return new ShippingWebhookController(process as never, validator as never)
  }

  it('valida HMAC e processa order.delivered', async () => {
    validator.validate.mockReturnValue(true)
    const controller = makeController()
    const rawBody = JSON.stringify({
      event: 'order.delivered',
      data: { id: 'me-1' },
    })
    const req = { rawBody: Buffer.from(rawBody), body: {} }
    const headers = { 'x-me-signature': 'sig' }

    const result = await controller.handle(req as never, headers)

    expect(validator.validate).toHaveBeenCalledWith(rawBody, 'sig')
    expect(process.execute).toHaveBeenCalledWith({
      event: 'order.delivered',
      data: {
        id: 'me-1',
        tracking: undefined,
        trackingUrl: undefined,
        protocol: undefined,
        status: undefined,
      },
    })
    expect(result).toEqual({ received: true })
  })

  it('mapeia tracking e tracking_url do payload para o use case', async () => {
    validator.validate.mockReturnValue(true)
    const controller = makeController()
    const rawBody = JSON.stringify({
      event: 'order.posted',
      data: {
        id: 'me-1',
        tracking: 'BR123456789',
        tracking_url: 'https://track/me-1',
        protocol: 'P1',
      },
    })

    await controller.handle(
      { rawBody: Buffer.from(rawBody), body: {} } as never,
      { 'x-me-signature': 'sig' },
    )

    expect(process.execute).toHaveBeenCalledWith({
      event: 'order.posted',
      data: {
        id: 'me-1',
        tracking: 'BR123456789',
        trackingUrl: 'https://track/me-1',
        protocol: 'P1',
        status: undefined,
      },
    })
  })

  it('lança 401 para assinatura inválida', async () => {
    validator.validate.mockReturnValue(false)
    const controller = makeController()

    await expect(
      controller.handle(
        { rawBody: Buffer.from('{}'), body: {} } as never,
        {},
      ),
    ).rejects.toThrow('Assinatura de webhook inválida')
  })

  it('ignora payload sem event/data.id', async () => {
    validator.validate.mockReturnValue(true)
    const controller = makeController()

    const result = await controller.handle(
      { rawBody: Buffer.from('{}'), body: {} } as never,
      { 'x-me-signature': 'sig' },
    )

    expect(process.execute).not.toHaveBeenCalled()
    expect(result).toEqual({ received: true })
  })
})
