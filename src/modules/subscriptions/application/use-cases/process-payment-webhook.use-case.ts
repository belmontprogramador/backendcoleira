import { Inject, Injectable } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { WEBHOOK_EVENT_REPOSITORY_PORT } from '../../domain/repositories/webhook-event.repository.port'
import type { WebhookEventRepositoryPort } from '../../domain/repositories/webhook-event.repository.port'
import { PAYMENT_WEBHOOK_VALIDATOR_PORT } from '../../domain/gateways/payment-webhook-validator.port'
import type { PaymentWebhookValidatorPort } from '../../domain/gateways/payment-webhook-validator.port'
import { PAYMENT_GATEWAY_PORT } from '../../domain/gateways/payment-gateway.port'
import type { PaymentGatewayPort } from '../../domain/gateways/payment-gateway.port'
import { PAYMENT_TRANSACTION_REPOSITORY_PORT } from '../../domain/repositories/payment-transaction.repository.port'
import type { PaymentTransactionRepositoryPort } from '../../domain/repositories/payment-transaction.repository.port'
import { SUBSCRIPTION_REPOSITORY_PORT } from '../../domain/repositories/subscription.repository.port'
import type { SubscriptionRepositoryPort } from '../../domain/repositories/subscription.repository.port'
import { PLAN_REPOSITORY_PORT } from '../../../plans/domain/repositories/plan.repository.port'
import type { PlanRepositoryPort } from '../../../plans/domain/repositories/plan.repository.port'
import { AUDIT_LOGGER_PORT } from '../../../../common/ports/audit-logger.port'
import type { AuditLoggerPort } from '../../../../common/ports/audit-logger.port'
import { InvalidWebhookSignatureError } from '../errors'
import { InvalidWebhookPayloadError } from '../errors'
import { WebhookEvent } from '../../domain/entities/webhook-event.entity'
import { Subscription } from '../../domain/entities/subscription.entity'
import { nextPeriod } from '../../domain/services/subscription-billing'

export interface ProcessPaymentWebhookInput {
  headers: Record<string, string | string[] | undefined>
  rawBody: string
  /** Query param `data.id` da URL (usado na validação da assinatura). */
  dataId: string
}

export interface ProcessPaymentWebhookResult {
  status: 'PROCESSED' | 'DUPLICATE'
}

/**
 * Caso de uso: processar webhook de pagamento (RF23, RNF09).
 *
 * Formato real do Mercado Pago (notifications):
 * `{ id, type: "payment", action: "payment.updated", data: { id: <payment_id> } }`.
 * O payload NÃO embute o status — ele é resolvido via `gateway.getPayment`.
 *
 * 1. Valida assinatura (HMAC).
 * 2. Idempotência via `WebhookEvent` (`provider + event_id` único → DUPLICATE).
 * 3. `APPROVED`: aprova a `PaymentTransaction`, cria/renova a `Subscription`
 *    (ACTIVE, período do plano) e audita; `REJECTED`/`REFUNDED`: transiciona a
 *    transação. A `Subscription` só nasce aqui (não no checkout).
 */
@Injectable()
export class ProcessPaymentWebhookUseCase {
  constructor(
    @Inject(WEBHOOK_EVENT_REPOSITORY_PORT)
    private readonly webhookEvents: WebhookEventRepositoryPort,
    @Inject(PAYMENT_WEBHOOK_VALIDATOR_PORT)
    private readonly validator: PaymentWebhookValidatorPort,
    @Inject(PAYMENT_GATEWAY_PORT)
    private readonly gateway: PaymentGatewayPort,
    @Inject(PAYMENT_TRANSACTION_REPOSITORY_PORT)
    private readonly transactions: PaymentTransactionRepositoryPort,
    @Inject(SUBSCRIPTION_REPOSITORY_PORT)
    private readonly subscriptions: SubscriptionRepositoryPort,
    @Inject(PLAN_REPOSITORY_PORT)
    private readonly plans: PlanRepositoryPort,
    @Inject(AUDIT_LOGGER_PORT)
    private readonly audit: AuditLoggerPort,
  ) {}

  async execute(
    input: ProcessPaymentWebhookInput,
    now = new Date(),
  ): Promise<ProcessPaymentWebhookResult> {
    if (!this.validator.validate(input.headers, input.dataId)) {
      throw new InvalidWebhookSignatureError()
    }

    let payload: Record<string, unknown>
    try {
      payload = JSON.parse(input.rawBody) as Record<string, unknown>
    } catch {
      throw new InvalidWebhookPayloadError()
    }

    const type = typeof payload.type === 'string' ? payload.type : ''
    const action =
      typeof payload.action === 'string' ? payload.action : 'payment.updated'
    const data = payload.data as Record<string, unknown> | undefined
    const paymentId =
      typeof data?.id === 'string'
        ? data.id
        : typeof data?.id === 'number'
          ? String(data.id)
          : ''
    const eventId =
      typeof payload.id === 'number'
        ? String(payload.id)
        : typeof payload.id === 'string'
          ? payload.id
          : ''

    if (eventId.length === 0) {
      throw new InvalidWebhookPayloadError()
    }

    const existing = await this.webhookEvents.findByProviderEventId(
      'MERCADO_PAGO',
      eventId,
    )
    if (existing) {
      existing.markDuplicate()
      await this.webhookEvents.save(existing)
      return { status: 'DUPLICATE' }
    }

    const event = WebhookEvent.create({
      id: randomUUID(),
      provider: 'MERCADO_PAGO',
      eventId,
      eventType: action || type,
      payload,
    })
    await this.webhookEvents.save(event)

    // Notificações que não são de pagamento (ex.: merchant_order) são
    // registradas e ignoradas.
    if (type !== 'payment' || paymentId.length === 0) {
      event.markProcessed()
      await this.webhookEvents.save(event)
      return { status: 'PROCESSED' }
    }

    const payment = await this.gateway.getPayment(paymentId)
    const paymentStatus = payment.status

    if (paymentStatus === 'APPROVED') {
      const handled = await this.handleApproved(event, paymentId, now)
      if (!handled) {
        return { status: 'PROCESSED' }
      }
    } else if (paymentStatus === 'REJECTED') {
      await this.transitionTransaction(paymentId, 'markRejected')
    } else if (paymentStatus === 'REFUNDED') {
      await this.transitionTransaction(paymentId, 'markRefunded')
    }

    event.markProcessed()
    await this.webhookEvents.save(event)
    return { status: 'PROCESSED' }
  }

  private async handleApproved(
    event: WebhookEvent,
    providerPaymentId: string,
    now: Date,
  ): Promise<boolean> {
    const transaction = await this.transactions.findByProviderPaymentId(
      'MERCADO_PAGO',
      providerPaymentId,
    )
    if (!transaction) {
      event.markFailed(
        'PaymentTransaction não encontrada para o payment_id do webhook',
      )
      await this.webhookEvents.save(event)
      return false
    }

    transaction.markApproved()

    if (transaction.planId) {
      const plan = await this.plans.findById(transaction.planId)
      if (plan) {
        const existing = await this.subscriptions.findByUserId(
          transaction.userId,
        )
        const period = nextPeriod(
          now,
          existing?.currentPeriodEnd ?? null,
          plan.interval,
          plan.intervalCount,
        )

        let subscription: Subscription
        if (existing) {
          existing.renew(period)
          subscription = existing
        } else {
          subscription = Subscription.create({
            id: randomUUID(),
            userId: transaction.userId,
            planId: plan.id,
            provider: 'MERCADO_PAGO',
            period,
          })
        }

        transaction.linkSubscription(subscription.id)
        await this.subscriptions.save(subscription)
        await this.audit.log({
          userId: transaction.userId,
          action: existing ? 'subscription.renewed' : 'subscription.activated',
          entity: 'Subscription',
          entityId: subscription.id,
          metadata: { planId: plan.id, providerPaymentId },
        })
      }
    }

    await this.transactions.save(transaction)
    return true
  }

  private async transitionTransaction(
    providerPaymentId: string,
    method: 'markRejected' | 'markRefunded',
  ): Promise<void> {
    const transaction = await this.transactions.findByProviderPaymentId(
      'MERCADO_PAGO',
      providerPaymentId,
    )
    if (transaction) {
      transaction[method]()
      await this.transactions.save(transaction)
    }
  }
}
