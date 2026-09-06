import { Controller, Headers, Inject, Logger, Post, Req } from '@nestjs/common'
import type { RawBodyRequest } from '@nestjs/common'
import type { Request } from 'express'
import { ProcessShippingWebhookUseCase } from '../../application/use-cases/process-shipping-webhook.use-case'
import { InvalidWebhookSignatureError } from '../../application/errors'
import { SHIPPING_WEBHOOK_VALIDATOR_PORT } from '../../../../infrastructure/shipping/shipping-webhook-validator.port'
import type { ShippingWebhookValidatorPort } from '../../../../infrastructure/shipping/shipping-webhook-validator.port'
import { Public } from '../../../../common/decorators/public.decorator'

/**
 * Webhook da Melhor Envio (`POST /webhooks/melhor-envio`).
 *
 * A assinatura `X-ME-Signature` (HMAC-SHA256 do corpo cru) é validada ANTES de
 * processar — assinatura inválida → 401 (fail-closed).
 */
@Controller('webhooks')
export class ShippingWebhookController {
  private readonly logger = new Logger(ShippingWebhookController.name)

  constructor(
    private readonly process: ProcessShippingWebhookUseCase,
    @Inject(SHIPPING_WEBHOOK_VALIDATOR_PORT)
    private readonly validator: ShippingWebhookValidatorPort,
  ) {}

  @Public()
  @Post('melhor-envio')
  async handle(
    @Req() req: RawBodyRequest<Request>,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ): Promise<{ received: true }> {
    const rawBody =
      req.rawBody?.toString('utf8') ??
      (typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {}))
    const signature =
      typeof headers['x-me-signature'] === 'string'
        ? headers['x-me-signature']
        : ''

    this.logger.log(
      `Webhook Melhor Envio recebido: X-ME-Signature=${signature ? 'presente' : 'ausente'}`,
    )

    if (!this.validator.validate(rawBody, signature)) {
      throw new InvalidWebhookSignatureError()
    }

    const payload = JSON.parse(rawBody) as {
      event?: string
      data?: { id?: string }
    }
    if (!payload.event || !payload.data?.id) {
      return { received: true }
    }

    await this.process.execute({
      event: payload.event,
      data: { id: payload.data.id },
    })
    return { received: true }
  }
}
