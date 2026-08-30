import { InitiateSubscriptionCheckoutUseCase } from '../initiate-subscription-checkout.use-case'
import type { PlanRepositoryPort } from '../../../../plans/domain/repositories/plan.repository.port'
import type { PaymentTransactionRepositoryPort } from '../../../domain/repositories/payment-transaction.repository.port'
import type { PaymentGatewayPort } from '../../../domain/gateways/payment-gateway.port'
import { PlanNotFoundError } from '../../../../plans/application/errors'
import { FreePlanCheckoutError } from '../../errors'
import { Plan } from '../../../../plans/domain/entities/plan.entity'
import { Price } from '../../../../../common/value-objects/price.vo'

describe('InitiateSubscriptionCheckoutUseCase', () => {
  let plans: jest.Mocked<PlanRepositoryPort>
  let transactions: jest.Mocked<PaymentTransactionRepositoryPort>
  let gateway: jest.Mocked<PaymentGatewayPort>

  beforeEach(() => {
    plans = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByIds: jest.fn(),
      findByCode: jest.fn(),
      findDefault: jest.fn(),
    }
    transactions = { save: jest.fn(), findByProviderPaymentId: jest.fn() }
    gateway = { createPayment: jest.fn() }
  })

  it('inicia checkout PIX e persiste transação PENDING', async () => {
    const plan = Plan.create({
      id: 'plan-1',
      code: 'PREMIUM',
      name: 'Premium',
      price: Price.create(1990),
    })
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

  it('BOLETO retorna boletoUrl', async () => {
    const plan = Plan.create({
      id: 'plan-1',
      code: 'PREMIUM',
      name: 'Premium',
      price: Price.create(1990),
    })
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
