import { Inject, Injectable } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { PLAN_REPOSITORY_PORT } from '../../../plans/domain/repositories/plan.repository.port'
import type { PlanRepositoryPort } from '../../../plans/domain/repositories/plan.repository.port'
import { PlanNotFoundError } from '../../../plans/application/errors'
import { FreePlanCheckoutError } from '../errors'
import { PAYMENT_TRANSACTION_REPOSITORY_PORT } from '../../domain/repositories/payment-transaction.repository.port'
import type { PaymentTransactionRepositoryPort } from '../../domain/repositories/payment-transaction.repository.port'
import { PAYMENT_GATEWAY_PORT } from '../../domain/gateways/payment-gateway.port'
import type { PaymentGatewayPort } from '../../domain/gateways/payment-gateway.port'
import type { PaymentMethod } from '../../domain/value-objects/payment-method.vo'
import type { PaymentStatus } from '../../domain/value-objects/payment-status.vo'
import { PaymentTransaction } from '../../domain/entities/payment-transaction.entity'

export interface InitiateSubscriptionCheckoutInput {
  userId: string
  planId: string
  paymentMethod: PaymentMethod
  payerEmail: string
  cardToken?: string
}

export interface CheckoutResult {
  transactionId: string
  providerPaymentId: string
  status: PaymentStatus
  pixQrCode?: string
  pixQrCodeBase64?: string
  boletoUrl?: string
  cardApproved?: boolean
}

/**
 * Caso de uso: iniciar checkout próprio (RF20, modelo B).
 *
 * Valida o plano (não gratuito), chama o gateway (cobra avulso) e persiste a
 * `PaymentTransaction(PENDING)`. NÃO cria `Subscription` — ela só nasce quando
 * o webhook confirma o pagamento (7.5).
 */
@Injectable()
export class InitiateSubscriptionCheckoutUseCase {
  constructor(
    @Inject(PLAN_REPOSITORY_PORT)
    private readonly plans: PlanRepositoryPort,
    @Inject(PAYMENT_TRANSACTION_REPOSITORY_PORT)
    private readonly transactions: PaymentTransactionRepositoryPort,
    @Inject(PAYMENT_GATEWAY_PORT)
    private readonly gateway: PaymentGatewayPort,
  ) {}

  async execute(
    input: InitiateSubscriptionCheckoutInput,
  ): Promise<CheckoutResult> {
    const plan = await this.plans.findById(input.planId)
    if (!plan) {
      throw new PlanNotFoundError()
    }

    if (plan.price.isZero()) {
      throw new FreePlanCheckoutError()
    }

    const result = await this.gateway.createPayment({
      amountCents: plan.price.amountInCents,
      method: input.paymentMethod,
      payerEmail: input.payerEmail,
      description: `Assinatura ${plan.name} — Coleira Cachorro`,
      cardToken: input.cardToken,
    })

    const transaction = PaymentTransaction.create({
      id: randomUUID(),
      userId: input.userId,
      planId: plan.id,
      provider: 'MERCADO_PAGO',
      providerPaymentId: result.providerPaymentId,
      paymentMethod: input.paymentMethod,
      amount: plan.price,
      status: result.status,
    })

    await this.transactions.save(transaction)

    return {
      transactionId: transaction.id,
      providerPaymentId: result.providerPaymentId,
      status: result.status,
      pixQrCode: result.pixQrCode,
      pixQrCodeBase64: result.pixQrCodeBase64,
      boletoUrl: result.boletoUrl,
      cardApproved: result.cardApproved,
    }
  }
}
