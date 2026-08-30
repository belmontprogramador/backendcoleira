import { Module } from '@nestjs/common'
import { PlansModule } from '../plans/plans.module'
import { UsersModule } from '../users/users.module'
import { SUBSCRIPTION_REPOSITORY_PORT } from './domain/repositories/subscription.repository.port'
import { SUBSCRIPTION_OWNER_INFO_PORT } from './domain/repositories/subscription-owner-info.port'
import { PAYMENT_TRANSACTION_REPOSITORY_PORT } from './domain/repositories/payment-transaction.repository.port'
import { WEBHOOK_EVENT_REPOSITORY_PORT } from './domain/repositories/webhook-event.repository.port'
import { PAYMENT_GATEWAY_PORT } from './domain/gateways/payment-gateway.port'
import { PAYMENT_WEBHOOK_VALIDATOR_PORT } from './domain/gateways/payment-webhook-validator.port'
import { PrismaSubscriptionRepository } from './infrastructure/repositories/prisma-subscription.repository'
import { PrismaSubscriptionOwnerInfo } from './infrastructure/repositories/prisma-subscription-owner-info'
import { PrismaPaymentTransactionRepository } from './infrastructure/repositories/prisma-payment-transaction.repository'
import { PrismaWebhookEventRepository } from './infrastructure/repositories/prisma-webhook-event.repository'
import { PrismaFeatureAccessService } from './infrastructure/prisma-feature-access.service'
import { MercadoPagoGateway } from './infrastructure/gateways/mercado-pago.gateway'
import { MercadoPagoWebhookValidator } from './infrastructure/gateways/mercado-pago-webhook.validator'
import { FEATURE_ACCESS_PORT } from '../../common/ports/feature-access.port'
import { CheckFeatureAccessUseCase } from './application/use-cases/check-feature-access.use-case'
import { GetUserPlanFeaturesUseCase } from './application/use-cases/get-user-plan-features.use-case'
import { InitiateSubscriptionCheckoutUseCase } from './application/use-cases/initiate-subscription-checkout.use-case'
import { ProcessPaymentWebhookUseCase } from './application/use-cases/process-payment-webhook.use-case'
import { GetSubscriptionUseCase } from './application/use-cases/get-subscription.use-case'
import { AdminGetUserPlanUseCase } from './application/use-cases/admin-get-user-plan.use-case'
import { ListSubscriptionsUseCase } from './application/use-cases/list-subscriptions.use-case'
import { CancelSubscriptionUseCase } from './application/use-cases/cancel-subscription.use-case'
import { AdminCancelSubscriptionUseCase } from './application/use-cases/admin-cancel-subscription.use-case'
import { AdminSubscriptionResponseAssembler } from './application/assemblers/admin-subscription-response.assembler'
import { SubscriptionsController } from './presentation/controllers/subscriptions.controller'
import { AdminSubscriptionsController } from './presentation/controllers/admin-subscriptions.controller'
import { PaymentWebhookController } from './presentation/controllers/payment-webhook.controller'

/**
 * Módulo de assinaturas (Feature System + ciclo de assinatura).
 * Importa `PlansModule` (catálogo) e `UsersModule` (para `USER_ACCESS_PORT`,
 * usado no cancelamento administrativo com hierarquia). Provê o
 * `FEATURE_ACCESS_PORT` (transversal) para o `FeatureGuard` e use cases Premium.
 */
@Module({
  imports: [PlansModule, UsersModule],
  controllers: [
    SubscriptionsController,
    AdminSubscriptionsController,
    PaymentWebhookController,
  ],
  providers: [
    PrismaSubscriptionRepository,
    {
      provide: SUBSCRIPTION_REPOSITORY_PORT,
      useClass: PrismaSubscriptionRepository,
    },
    PrismaSubscriptionOwnerInfo,
    {
      provide: SUBSCRIPTION_OWNER_INFO_PORT,
      useClass: PrismaSubscriptionOwnerInfo,
    },
    PrismaPaymentTransactionRepository,
    {
      provide: PAYMENT_TRANSACTION_REPOSITORY_PORT,
      useClass: PrismaPaymentTransactionRepository,
    },
    PrismaWebhookEventRepository,
    {
      provide: WEBHOOK_EVENT_REPOSITORY_PORT,
      useClass: PrismaWebhookEventRepository,
    },
    { provide: PAYMENT_GATEWAY_PORT, useClass: MercadoPagoGateway },
    {
      provide: PAYMENT_WEBHOOK_VALIDATOR_PORT,
      useClass: MercadoPagoWebhookValidator,
    },
    { provide: FEATURE_ACCESS_PORT, useClass: PrismaFeatureAccessService },
    CheckFeatureAccessUseCase,
    GetUserPlanFeaturesUseCase,
    InitiateSubscriptionCheckoutUseCase,
    ProcessPaymentWebhookUseCase,
    GetSubscriptionUseCase,
    AdminGetUserPlanUseCase,
    ListSubscriptionsUseCase,
    CancelSubscriptionUseCase,
    AdminCancelSubscriptionUseCase,
    AdminSubscriptionResponseAssembler,
  ],
  exports: [
    SUBSCRIPTION_REPOSITORY_PORT,
    SUBSCRIPTION_OWNER_INFO_PORT,
    PAYMENT_TRANSACTION_REPOSITORY_PORT,
    WEBHOOK_EVENT_REPOSITORY_PORT,
    PAYMENT_GATEWAY_PORT,
    PAYMENT_WEBHOOK_VALIDATOR_PORT,
    FEATURE_ACCESS_PORT,
    CheckFeatureAccessUseCase,
    GetUserPlanFeaturesUseCase,
    InitiateSubscriptionCheckoutUseCase,
    ProcessPaymentWebhookUseCase,
    GetSubscriptionUseCase,
    AdminGetUserPlanUseCase,
    ListSubscriptionsUseCase,
    CancelSubscriptionUseCase,
    AdminCancelSubscriptionUseCase,
  ],
})
export class SubscriptionsModule {}
