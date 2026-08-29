import { Controller, Headers, Post, Req } from '@nestjs/common'
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
  constructor(private readonly process: ProcessPaymentWebhookUseCase) {}

  @Public()
  @Post('payment')
  async handle(
    @Req() req: RawBodyRequest<Request>,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ): Promise<{ received: true }> {
    const rawBody =
      req.rawBody?.toString('utf8') ??
      (typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {}))

    await this.process.execute({ headers, rawBody })
    return { received: true }
  }
}
