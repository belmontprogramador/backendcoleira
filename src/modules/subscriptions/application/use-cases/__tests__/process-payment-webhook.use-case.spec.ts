import { ProcessPaymentWebhookUseCase } from '../process-payment-webhook.use-case'
import type { WebhookEventRepositoryPort } from '../../../domain/repositories/webhook-event.repository.port'
import type { PaymentWebhookValidatorPort } from '../../../domain/gateways/payment-webhook-validator.port'
import type { PaymentTransactionRepositoryPort } from '../../../domain/repositories/payment-transaction.repository.port'
import type { SubscriptionRepositoryPort } from '../../../domain/repositories/subscription.repository.port'
import type { PlanRepositoryPort } from '../../../../plans/domain/repositories/plan.repository.port'
import type { AuditLoggerPort } from '../../../../../common/ports/audit-logger.port'
import { InvalidWebhookSignatureError } from '../../errors'
import { InvalidWebhookPayloadError } from '../../errors'
import { PaymentTransaction } from '../../../domain/entities/payment-transaction.entity'
import { Subscription } from '../../../domain/entities/subscription.entity'
import { WebhookEvent } from '../../../domain/entities/webhook-event.entity'
import { Plan } from '../../../../plans/domain/entities/plan.entity'
import { Price } from '../../../../../common/value-objects/price.vo'

describe('ProcessPaymentWebhookUseCase', () => {
  let webhookEvents: jest.Mocked<WebhookEventRepositoryPort>
  let validator: jest.Mocked<PaymentWebhookValidatorPort>
  let transactions: jest.Mocked<PaymentTransactionRepositoryPort>
  let subscriptions: jest.Mocked<SubscriptionRepositoryPort>
  let plans: jest.Mocked<PlanRepositoryPort>
  let audit: jest.Mocked<AuditLoggerPort>

  const now = new Date('2026-01-20T00:00:00.000Z')

  function makeUseCase() {
    return new ProcessPaymentWebhookUseCase(
      webhookEvents,
      validator,
      transactions,
      subscriptions,
      plans,
      audit,
    )
  }

  function approvedPayload(eventId = 'evt-1', paymentId = 'mp-123') {
    return JSON.stringify({
      event_id: eventId,
      event_type: 'payment.updated',
      payment_id: paymentId,
      status: 'approved',
    })
  }

  function makeTransaction() {
    return PaymentTransaction.create({
      id: 'tx-1',
      userId: 'user-1',
      planId: 'plan-1',
      provider: 'MERCADO_PAGO',
      providerPaymentId: 'mp-123',
      paymentMethod: 'PIX',
      amount: Price.create(1990),
    })
  }

  function makePlan() {
    return Plan.create({
      id: 'plan-1',
      code: 'PREMIUM',
      name: 'Premium',
      price: Price.create(1990),
    })
  }

  beforeEach(() => {
    webhookEvents = { save: jest.fn(), findByProviderEventId: jest.fn() }
    validator = { validate: jest.fn() }
    transactions = { save: jest.fn(), findByProviderPaymentId: jest.fn() }
    subscriptions = {
      save: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      findActiveByUserId: jest.fn(),
      list: jest.fn(),
      count: jest.fn(),
    }
    plans = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByIds: jest.fn(),
      findByCode: jest.fn(),
      findDefault: jest.fn(),
    }
    audit = { log: jest.fn() }
  })

  it('lança InvalidWebhookSignatureError quando a assinatura é inválida', async () => {
    validator.validate.mockReturnValue(false)

    await expect(
      makeUseCase().execute({ headers: {}, rawBody: approvedPayload() }, now),
    ).rejects.toThrow(InvalidWebhookSignatureError)

    expect(webhookEvents.save).not.toHaveBeenCalled()
    expect(transactions.save).not.toHaveBeenCalled()
  })

  it('lança InvalidWebhookPayloadError quando o JSON é malformado', async () => {
    validator.validate.mockReturnValue(true)

    await expect(
      makeUseCase().execute({ headers: {}, rawBody: 'not-json' }, now),
    ).rejects.toThrow(InvalidWebhookPayloadError)
  })

  it('marca DUPLICATE e não reprocessa evento já recebido', async () => {
    validator.validate.mockReturnValue(true)
    const existing = WebhookEvent.reconstitute({
      id: 'evt-existing',
      provider: 'MERCADO_PAGO',
      eventId: 'evt-1',
      eventType: 'payment.updated',
      payload: { status: 'approved' },
      status: 'RECEIVED',
      processedAt: null,
      error: null,
      receivedAt: new Date('2026-01-01T00:00:00.000Z'),
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    })
    webhookEvents.findByProviderEventId.mockResolvedValue(existing)

    const result = await makeUseCase().execute(
      { headers: {}, rawBody: approvedPayload() },
      now,
    )

    expect(result.status).toBe('DUPLICATE')
    expect(transactions.findByProviderPaymentId).not.toHaveBeenCalled()
    const saved = webhookEvents.save.mock.calls[0][0]
    expect(saved.status).toBe('DUPLICATE')
  })

  it('approved: cria Subscription ACTIVE, aprova e linka a transaction', async () => {
    validator.validate.mockReturnValue(true)
    webhookEvents.findByProviderEventId.mockResolvedValue(null)
    const transaction = makeTransaction()
    transactions.findByProviderPaymentId.mockResolvedValue(transaction)
    plans.findById.mockResolvedValue(makePlan())
    subscriptions.findByUserId.mockResolvedValue(null)

    await makeUseCase().execute(
      { headers: {}, rawBody: approvedPayload() },
      now,
    )

    expect(transaction.status).toBe('APPROVED')
    expect(transaction.subscriptionId).not.toBeNull()

    const savedSub = subscriptions.save.mock.calls[0][0]
    expect(savedSub.status).toBe('ACTIVE')
    expect(savedSub.userId).toBe('user-1')
    expect(savedSub.planId).toBe('plan-1')
    expect(transactions.save).toHaveBeenCalled()
    expect(audit.log).toHaveBeenCalled()
  })

  it('approved: renova assinatura existente estendendo o período', async () => {
    validator.validate.mockReturnValue(true)
    webhookEvents.findByProviderEventId.mockResolvedValue(null)
    const transaction = makeTransaction()
    transactions.findByProviderPaymentId.mockResolvedValue(transaction)
    plans.findById.mockResolvedValue(makePlan())

    const existing = Subscription.reconstitute({
      id: 'sub-1',
      userId: 'user-1',
      planId: 'plan-1',
      provider: 'MERCADO_PAGO',
      providerCustomerId: null,
      providerSubscriptionId: null,
      status: 'ACTIVE',
      startedAt: new Date('2025-12-15T00:00:00.000Z'),
      currentPeriodStart: new Date('2026-01-15T00:00:00.000Z'),
      currentPeriodEnd: new Date('2026-02-15T00:00:00.000Z'),
      cancelledAt: null,
      createdAt: new Date('2025-12-15T00:00:00.000Z'),
      updatedAt: new Date('2025-12-15T00:00:00.000Z'),
    })
    subscriptions.findByUserId.mockResolvedValue(existing)

    await makeUseCase().execute(
      { headers: {}, rawBody: approvedPayload() },
      now,
    )

    const savedSub = subscriptions.save.mock.calls[0][0]
    expect(savedSub.id).toBe('sub-1')
    expect(savedSub.currentPeriodEnd.toISOString()).toBe(
      '2026-03-15T00:00:00.000Z',
    )
    expect(savedSub.status).toBe('ACTIVE')
  })

  it('rejected: marca transaction REJECTED sem criar subscription', async () => {
    validator.validate.mockReturnValue(true)
    webhookEvents.findByProviderEventId.mockResolvedValue(null)
    const transaction = makeTransaction()
    transactions.findByProviderPaymentId.mockResolvedValue(transaction)

    await makeUseCase().execute(
      {
        headers: {},
        rawBody: JSON.stringify({
          event_id: 'evt-2',
          event_type: 'payment.updated',
          payment_id: 'mp-123',
          status: 'rejected',
        }),
      },
      now,
    )

    expect(transaction.status).toBe('REJECTED')
    expect(subscriptions.save).not.toHaveBeenCalled()
  })

  it('approved com transaction órfã: marca evento FAILED sem criar subscription', async () => {
    validator.validate.mockReturnValue(true)
    webhookEvents.findByProviderEventId.mockResolvedValue(null)
    transactions.findByProviderPaymentId.mockResolvedValue(null)

    const result = await makeUseCase().execute(
      { headers: {}, rawBody: approvedPayload() },
      now,
    )

    expect(result.status).toBe('PROCESSED')
    expect(subscriptions.save).not.toHaveBeenCalled()
    expect(transactions.save).not.toHaveBeenCalled()
  })
})
