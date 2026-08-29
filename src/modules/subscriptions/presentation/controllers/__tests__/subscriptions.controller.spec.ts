import { SubscriptionsController } from '../subscriptions.controller'
import { GetSubscriptionUseCase } from '../../../application/use-cases/get-subscription.use-case'
import { InitiateSubscriptionCheckoutUseCase } from '../../../application/use-cases/initiate-subscription-checkout.use-case'
import { CancelSubscriptionUseCase } from '../../../application/use-cases/cancel-subscription.use-case'
import { Subscription } from '../../../domain/entities/subscription.entity'

describe('SubscriptionsController', () => {
  let getSubscription: jest.Mocked<GetSubscriptionUseCase>
  let checkout: jest.Mocked<InitiateSubscriptionCheckoutUseCase>
  let cancel: jest.Mocked<CancelSubscriptionUseCase>
  let controller: SubscriptionsController

  const user = { sub: 'user-1', email: 'owner@email.com' }

  function makeSubscription() {
    return Subscription.reconstitute({
      id: 'sub-1',
      userId: 'user-1',
      planId: 'plan-1',
      provider: 'MERCADO_PAGO',
      providerCustomerId: null,
      providerSubscriptionId: null,
      status: 'ACTIVE',
      startedAt: new Date('2026-01-01T00:00:00.000Z'),
      currentPeriodStart: new Date('2026-01-01T00:00:00.000Z'),
      currentPeriodEnd: new Date('2026-02-01T00:00:00.000Z'),
      cancelledAt: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    })
  }

  beforeEach(() => {
    getSubscription = {
      execute: jest.fn(),
    } as jest.Mocked<GetSubscriptionUseCase>
    checkout = {
      execute: jest.fn(),
    } as jest.Mocked<InitiateSubscriptionCheckoutUseCase>
    cancel = {
      execute: jest.fn(),
    } as jest.Mocked<CancelSubscriptionUseCase>
    controller = new SubscriptionsController(getSubscription, checkout, cancel)
  })

  it('current: retorna null quando não há assinatura', async () => {
    getSubscription.execute.mockResolvedValue(null)

    const result = await controller.current(user)

    expect(result).toBeNull()
    expect(getSubscription.execute).toHaveBeenCalledWith('user-1')
  })

  it('current: mapeia assinatura ativa para response', async () => {
    getSubscription.execute.mockResolvedValue(makeSubscription())

    const result = await controller.current(user)

    expect(result).toMatchObject({
      id: 'sub-1',
      planId: 'plan-1',
      status: 'ACTIVE',
    })
  })

  it('checkout: delega ao use case com payerEmail do JWT', async () => {
    checkout.execute.mockResolvedValue({
      transactionId: 'tx-1',
      providerPaymentId: 'mp-123',
      status: 'PENDING',
      pixQrCode: 'qr',
    })

    const result = await controller.checkoutRoute(user, {
      planId: 'plan-1',
      paymentMethod: 'PIX',
    })

    expect(result).toMatchObject({ providerPaymentId: 'mp-123' })
    expect(checkout.execute).toHaveBeenCalledWith({
      userId: 'user-1',
      planId: 'plan-1',
      paymentMethod: 'PIX',
      payerEmail: 'owner@email.com',
      cardToken: undefined,
    })
  })

  it('cancel: delega e mapeia a assinatura cancelada', async () => {
    cancel.execute.mockResolvedValue(makeSubscription())

    const result = await controller.cancelRoute(user)

    expect(cancel.execute).toHaveBeenCalledWith('user-1')
    expect(result).toMatchObject({ id: 'sub-1', status: 'ACTIVE' })
  })
})
