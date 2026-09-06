import { OrderWebhookController } from '../order-webhook.controller'

describe('OrderWebhookController', () => {
  const payOrder = { execute: jest.fn().mockResolvedValue({ processed: true }) }
  const validator = { validate: jest.fn() }

  function makeController() {
    return new OrderWebhookController(payOrder as never, validator as never)
  }

  it('valida a assinatura e processa o pagamento', async () => {
    validator.validate.mockReturnValue(true)
    const controller = makeController()
    const req = {
      rawBody: Buffer.from('{}'),
      query: { 'data.id': 'mp-1' },
    }
    const headers = { 'x-signature': 'sig' }

    const result = await controller.handle(req as never, headers)

    expect(validator.validate).toHaveBeenCalledWith(headers, 'mp-1')
    expect(payOrder.execute).toHaveBeenCalledWith({ paymentId: 'mp-1' })
    expect(result).toEqual({ received: true })
  })

  it('lança 401 para assinatura inválida', async () => {
    validator.validate.mockReturnValue(false)
    const controller = makeController()
    const req = { rawBody: Buffer.from('{}'), query: { 'data.id': 'mp-1' } }

    await expect(controller.handle(req as never, {})).rejects.toThrow(
      'Assinatura de webhook inválida',
    )
  })
})
