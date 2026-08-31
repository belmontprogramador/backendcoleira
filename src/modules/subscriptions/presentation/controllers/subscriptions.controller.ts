import { Body, Controller, Get, Post } from '@nestjs/common'
import { GetSubscriptionUseCase } from '../../application/use-cases/get-subscription.use-case'
import { GetUserPlanFeaturesUseCase } from '../../application/use-cases/get-user-plan-features.use-case'
import { InitiateSubscriptionCheckoutUseCase } from '../../application/use-cases/initiate-subscription-checkout.use-case'
import { CancelSubscriptionUseCase } from '../../application/use-cases/cancel-subscription.use-case'
import { SubscriptionResponseMapper } from '../../application/mappers/subscription-response.mapper'
import { checkoutSchema } from '../../application/dtos/checkout.schema'
import type { CheckoutDto } from '../../application/dtos/checkout.schema'
import { CurrentUser } from '../../../../common/decorators/current-user.decorator'
import type { RequestUser } from '../../../../common/decorators/current-user.decorator'
import { ZodValidationPipe } from '../../../../common/pipes/zod-validation.pipe'

/**
 * Rotas de assinatura do usuário autenticado (`/subscriptions`).
 * - `GET /current`  → assinatura atual (expiração lazy).
 * - `GET /features` → plano atual + features ativas (para a UI).
 * - `POST /checkout` → checkout próprio (PIX/cartão/boleto).
 * - `POST /cancel`  → cancelamento (RF21).
 */
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private readonly getSubscription: GetSubscriptionUseCase,
    private readonly checkout: InitiateSubscriptionCheckoutUseCase,
    private readonly cancel: CancelSubscriptionUseCase,
    private readonly getUserPlanFeatures: GetUserPlanFeaturesUseCase,
  ) {}

  @Get('current')
  async current(@CurrentUser() user: RequestUser) {
    const subscription = await this.getSubscription.execute(user.sub)
    return subscription
      ? SubscriptionResponseMapper.toResponse(subscription)
      : null
  }

  @Get('features')
  async features(@CurrentUser() user: RequestUser) {
    const result = await this.getUserPlanFeatures.execute(user.sub)
    return {
      code: result.plan?.code ?? null,
      features: result.features.map(feature => feature.code),
    }
  }

  @Post('checkout')
  async checkoutRoute(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(checkoutSchema)) body: CheckoutDto,
  ) {
    return this.checkout.execute({
      userId: user.sub,
      planId: body.planId,
      paymentMethod: body.paymentMethod,
      payerEmail: user.email,
      cardToken: body.cardToken,
      cardPaymentMethodId: body.cardPaymentMethodId,
      cardInstallments: body.cardInstallments,
      cardIssuerId: body.cardIssuerId,
      payerIdentificationType: body.payerIdentificationType,
      payerIdentificationNumber: body.payerIdentificationNumber,
      payerFirstName: body.payerFirstName,
      payerLastName: body.payerLastName,
    })
  }

  @Post('cancel')
  async cancelRoute(@CurrentUser() user: RequestUser) {
    const subscription = await this.cancel.execute(user.sub)
    return SubscriptionResponseMapper.toResponse(subscription)
  }
}
