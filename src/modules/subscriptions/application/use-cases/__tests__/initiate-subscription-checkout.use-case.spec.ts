import { InitiateSubscriptionCheckoutUseCase } from '../initiate-subscription-checkout.use-case'
import type { PlanRepositoryPort } from '../../../../plans/domain/repositories/plan.repository.port'
import type { PaymentTransactionRepositoryPort } from '../../../domain/repositories/payment-transaction.repository.port'
import type { SubscriptionRepositoryPort } from '../../../domain/repositories/subscription.repository.port'
import type { PaymentGatewayPort } from '../../../domain/gateways/payment-gateway.port'
import { PlanNotFoundError } from '../../../../plans/application/errors'
import { FreePlanCheckoutError } from '../../errors'
import { ActiveSubscriptionExistsError } from '../../errors'
import { Plan } from '../../../../plans/domain/entities/plan.entity'
import { Subscription } from '../../../domain/entities/subscription.entity'
import { Price } from '../../../../../common/value-objects/price.vo'

describe('InitiateSubscriptionCheckoutUseCase', () => {
  let plans: jest.Mocked<PlanRepositoryPort>
  let transactions: jest.Mocked<PaymentTransactionRepositoryPort>
  let gateway: jest.Mocked<PaymentGatewayPort>
  let subscriptions: jest.Mocked<SubscriptionRepositoryPort>

  beforeEach(() => {
    plans = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByIds: jest.fn(),
      findByCode: jest.fn(),
      findDefault: jest.fn(),
      update: jest.fn(),
    }
    transactions = { save: jest.fn(), findByProviderPaymentId: jest.fn() }
    gateway = { createPayment: jest.fn(), getPayment: jest.fn() }
    subscriptions = {
      save: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      findActiveByUserId: jest.fn(),
      list: jest.fn(),
      count: jest.fn(),
    }
    subscriptions.findActiveByUserId.mockResolvedValue(null)
  })

  function makePlan(): Plan {
    return Plan.create({
      id: 'plan-1',
      code: 'PREMIUM',
      name: 'Premium',
      price: Price.create(1990),
    })
  }

  function makeActiveSubscription(currentPeriodEnd: Date): Subscription {
    return Subscription.reconstitute({
      id: 'sub-1',
      userId: 'user-1',
      planId: 'plan-1',
      provider: 'MERCADO_PAGO',
      providerCustomerId: null,
      providerSubscriptionId: null,
      status: 'ACTIVE',
      startedAt: new Date('2026-08-01T00:00:00Z'),
      currentPeriodStart: new Date('2026-08-01T00:00:00Z'),
      currentPeriodEnd,
      cancelledAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  it('inicia checkout PIX e persiste transação PENDING', async () => {
    const plan = makePlan()
    plans.findById.mockResolvedValue(plan)
    gateway.createPayment.mockResolvedValue({
      providerPaymentId: 'mp-123',
      status: 'PENDING',
      pixQrCode: 'qr-code',
      pixQrCodeBase64: 'b64',
    })

    const useCase = new InitiateSubscriptionCheckoutUseCase(
      plans,
      transactions,
      gateway,
      subscriptions,
    )
    const result = await useCase.execute({
      userId: 'user-1',
      planId: 'plan-1',
      paymentMethod: 'PIX',
      payerEmail: 'owner@email.com',
    })

    expect(result.providerPaymentId).toBe('mp-123')
    expect(result.pixQrCode).toBe('qr-code')
    expect(transactions.save).toHaveBeenCalledTimes(1)
    const saved = transactions.save.mock.calls[0][0]
    expect(saved.status).toBe('PENDING')
    expect(saved.providerPaymentId).toBe('mp-123')
    expect(saved.amount.amountInCents).toBe(1990)
  })

  it('lança PlanNotFoundError se o plano não existe', async () => {
    plans.findById.mockResolvedValue(null)
    const useCase = new InitiateSubscriptionCheckoutUseCase(
      plans,
      transactions,
      gateway,
      subscriptions,
    )

    await expect(
      useCase.execute({
        userId: 'user-1',
        planId: 'x',
        paymentMethod: 'PIX',
        payerEmail: 'a@b.com',
      }),
    ).rejects.toThrow(PlanNotFoundError)
  })

  it('lança FreePlanCheckoutError ao tentar assinar o Basic', async () => {
    const plan = Plan.create({
      id: 'plan-basic',
      code: 'BASIC',
      name: 'Basic',
      price: Price.create(0),
    })
    plans.findById.mockResolvedValue(plan)
    const useCase = new InitiateSubscriptionCheckoutUseCase(
      plans,
      transactions,
      gateway,
      subscriptions,
    )

    await expect(
      useCase.execute({
        userId: 'user-1',
        planId: 'plan-basic',
        paymentMethod: 'PIX',
        payerEmail: 'a@b.com',
      }),
    ).rejects.toThrow(FreePlanCheckoutError)
    expect(gateway.createPayment).not.toHaveBeenCalled()
  })

  it('lança ActiveSubscriptionExistsError se o usuário já tem assinatura ativa', async () => {
    plans.findById.mockResolvedValue(makePlan())
    subscriptions.findActiveByUserId.mockResolvedValue(
      makeActiveSubscription(new Date(Date.now() + 86_400_000)),
    )

    const useCase = new InitiateSubscriptionCheckoutUseCase(
      plans,
      transactions,
      gateway,
      subscriptions,
    )

    await expect(
      useCase.execute({
        userId: 'user-1',
        planId: 'plan-1',
        paymentMethod: 'PIX',
        payerEmail: 'a@b.com',
      }),
    ).rejects.toThrow(ActiveSubscriptionExistsError)
    expect(gateway.createPayment).not.toHaveBeenCalled()
    expect(transactions.save).not.toHaveBeenCalled()
  })

  it('permite checkout quando a assinatura existente já expirou (período vencido)', async () => {
    plans.findById.mockResolvedValue(makePlan())
    subscriptions.findActiveByUserId.mockResolvedValue(
      makeActiveSubscription(new Date(Date.now() - 86_400_000)),
    )
    gateway.createPayment.mockResolvedValue({
      providerPaymentId: 'mp-123',
      status: 'PENDING',
    })

    const useCase = new InitiateSubscriptionCheckoutUseCase(
      plans,
      transactions,
      gateway,
      subscriptions,
    )
    const result = await useCase.execute({
      userId: 'user-1',
      planId: 'plan-1',
      paymentMethod: 'PIX',
      payerEmail: 'a@b.com',
    })

    expect(result.providerPaymentId).toBe('mp-123')
    expect(gateway.createPayment).toHaveBeenCalledTimes(1)
  })

  it('BOLETO retorna boletoUrl', async () => {
    const plan = makePlan()
    plans.findById.mockResolvedValue(plan)
    gateway.createPayment.mockResolvedValue({
      providerPaymentId: 'mp-123',
      status: 'PENDING',
      boletoUrl: 'https://boleto',
    })

    const useCase = new InitiateSubscriptionCheckoutUseCase(
      plans,
      transactions,
      gateway,
      subscriptions,
    )
    const result = await useCase.execute({
      userId: 'user-1',
      planId: 'plan-1',
      paymentMethod: 'BOLETO',
      payerEmail: 'owner@email.com',
    })

    expect(result.boletoUrl).toBe('https://boleto')
  })
})
