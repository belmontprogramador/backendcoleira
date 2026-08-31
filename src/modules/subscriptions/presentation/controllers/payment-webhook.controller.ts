import { Controller, Headers, Logger, Post, Req } from '@nestjs/common'
import type { RawBodyRequest } from '@nestjs/common'
import type { Request } from 'express'
import { ProcessPaymentWebhookUseCase } from '../../application/use-cases/process-payment-webhook.use-case'
import { Public } from '../../../../common/decorators/public.decorator'

/**
 * Rota pública de webhook de pagamento (`POST /webhooks/payment`).
 * O body é validado por assinatura (HMAC) + idempotência, não por Zod.
 */
@Controller('webhooks')
export class PaymentWebhookController {
  private readonly logger = new Logger(PaymentWebhookController.name)

  constructor(private readonly process: ProcessPaymentWebhookUseCase) {}

  @Public()
  @Post('payment')
  async handle(
    @Req() req: RawBodyRequest<Request>,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ): Promise<{ received: true }> {
    const dataId = this.extractDataId(req)
    this.logger.log(
      `Webhook recebido: x-signature=${typeof headers['x-signature'] === 'string' ? 'presente' : 'ausente'}, ` +
        `x-request-id=${typeof headers['x-request-id'] === 'string' ? 'presente' : 'ausente'}, ` +
        `data.id=${dataId || '(ausente)'}`,
    )

    const rawBody =
      req.rawBody?.toString('utf8') ??
      (typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {}))

    await this.process.execute({ headers, rawBody, dataId })
    return { received: true }
  }

  private extractDataId(req: RawBodyRequest<Request>): string {
    const value = (req.query as Record<string, unknown>)['data.id']
    if (typeof value === 'string') return value
    if (Array.isArray(value) && typeof value[0] === 'string') return value[0]
    return ''
  }
}
