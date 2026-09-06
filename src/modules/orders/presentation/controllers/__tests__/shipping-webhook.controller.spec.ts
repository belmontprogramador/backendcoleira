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
      data: { id: 'me-1' },
    })
    expect(result).toEqual({ received: true })
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
