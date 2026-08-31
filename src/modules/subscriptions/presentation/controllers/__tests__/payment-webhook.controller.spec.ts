import { RawBodyRequest } from '@nestjs/common'
import type { Request } from 'express'
import { PaymentWebhookController } from '../payment-webhook.controller'
import { ProcessPaymentWebhookUseCase } from '../../../application/use-cases/process-payment-webhook.use-case'

describe('PaymentWebhookController', () => {
  let process: jest.Mocked<ProcessPaymentWebhookUseCase>
  let controller: PaymentWebhookController

  beforeEach(() => {
    process = {
      execute: jest.fn(),
    } as jest.Mocked<ProcessPaymentWebhookUseCase>
    process.execute.mockResolvedValue({ status: 'PROCESSED' })
    controller = new PaymentWebhookController(process)
  })

  it('extrai rawBody, data.id e headers e delega ao use case', async () => {
    const req = {
      rawBody: Buffer.from('{"status":"approved"}'),
      body: { status: 'approved' },
      query: { 'data.id': 'mp-123' },
    } as unknown as RawBodyRequest<Request>
    const headers = { 'x-signature': 'sig' }

    const result = await controller.handle(req, headers)

    expect(result).toEqual({ received: true })
    expect(process.execute).toHaveBeenCalledWith({
      headers,
      rawBody: '{"status":"approved"}',
      dataId: 'mp-123',
    })
  })

  it('usa JSON.stringify(body) como fallback quando não há rawBody', async () => {
    const req = {
      rawBody: undefined,
      body: { status: 'approved' },
      query: {},
    } as unknown as RawBodyRequest<Request>

    await controller.handle(req, {})

    expect(process.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        rawBody: '{"status":"approved"}',
        dataId: '',
      }),
    )
  })

  it('extrai data.id vazio quando o query param está ausente', async () => {
    const req = {
      rawBody: Buffer.from('{"status":"approved"}'),
      body: { status: 'approved' },
      query: {},
    } as unknown as RawBodyRequest<Request>

    await controller.handle(req, {})

    expect(process.execute).toHaveBeenCalledWith(
      expect.objectContaining({ dataId: '' }),
    )
  })
})
