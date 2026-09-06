import { Controller, Headers, Inject, Logger, Post, Req } from '@nestjs/common'
import type { RawBodyRequest } from '@nestjs/common'
import type { Request } from 'express'
import { PayOrderWebhookUseCase } from '../../application/use-cases/pay-order-webhook.use-case'
import { PAYMENT_WEBHOOK_VALIDATOR_PORT } from '../../../../common/ports/payment-webhook-validator.port'
import type { PaymentWebhookValidatorPort } from '../../../../common/ports/payment-webhook-validator.port'
import { InvalidWebhookSignatureError } from '../../application/errors'
import { Public } from '../../../../common/decorators/public.decorator'

/**
 * Webhook do Mercado Pago para a venda (`POST /orders/webhook`).
 *
 * A assinatura (HMAC do header `x-signature` sobre o manifesto `data.id`) é
 * validada ANTES de processar — assinatura inválida → 401 (fail-closed).
 */
@Controller('orders')
export class OrderWebhookController {
  private readonly logger = new Logger(OrderWebhookController.name)

  constructor(
    private readonly payOrder: PayOrderWebhookUseCase,
    @Inject(PAYMENT_WEBHOOK_VALIDATOR_PORT)
    private readonly validator: PaymentWebhookValidatorPort,
  ) {}

  @Public()
  @Post('webhook')
  async handle(
    @Req() req: RawBodyRequest<Request>,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ): Promise<{ received: true }> {
    const dataId = this.extractDataId(req)
    this.logger.log(
      `Webhook de pedido recebido: x-signature=${typeof headers['x-signature'] === 'string' ? 'presente' : 'ausente'}, ` +
        `data.id=${dataId || '(ausente)'}`,
    )

    if (!this.validator.validate(headers, dataId)) {
      throw new InvalidWebhookSignatureError()
    }

    await this.payOrder.execute({ paymentId: dataId })
    return { received: true }
  }

  private extractDataId(req: RawBodyRequest<Request>): string {
    const value = (req.query as Record<string, unknown>)['data.id']
    if (typeof value === 'string') return value
    if (Array.isArray(value) && typeof value[0] === 'string') return value[0]
    return ''
  }
}
