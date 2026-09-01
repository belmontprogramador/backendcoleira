import { SubscriptionsController } from '../subscriptions.controller'
import { GetSubscriptionUseCase } from '../../../application/use-cases/get-subscription.use-case'
import { GetUserPlanFeaturesUseCase } from '../../../application/use-cases/get-user-plan-features.use-case'
import { InitiateSubscriptionCheckoutUseCase } from '../../../application/use-cases/initiate-subscription-checkout.use-case'
import { CancelSubscriptionUseCase } from '../../../application/use-cases/cancel-subscription.use-case'
import { Subscription } from '../../../domain/entities/subscription.entity'

describe('SubscriptionsController', () => {
  let getSubscription: jest.Mocked<GetSubscriptionUseCase>
  let checkout: jest.Mocked<InitiateSubscriptionCheckoutUseCase>
  let cancel: jest.Mocked<CancelSubscriptionUseCase>
  let getUserPlanFeatures: jest.Mocked<GetUserPlanFeaturesUseCase>
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
    getUserPlanFeatures = {
      execute: jest.fn(),
    } as jest.Mocked<GetUserPlanFeaturesUseCase>
    controller = new SubscriptionsController(
      getSubscription,
      checkout,
      cancel,
      getUserPlanFeatures,
    )
  })

  it('current: retorna null quando não há assinatura', async () => {
    getSubscription.execute.mockResolvedValue(null)
    const res = { json: jest.fn().mockReturnValue(undefined) }

    await controller.current(user, res as never)

    expect(res.json).toHaveBeenCalledWith(null)
    expect(getSubscription.execute).toHaveBeenCalledWith('user-1')
  })

  it('current: mapeia assinatura ativa para response', async () => {
    getSubscription.execute.mockResolvedValue(makeSubscription())
    const res = { json: jest.fn().mockReturnValue(undefined) }

    await controller.current(user, res as never)

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'sub-1',
        planId: 'plan-1',
        status: 'ACTIVE',
      }),
    )
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

  it('features: retorna code e features do plano ativo', async () => {
    getUserPlanFeatures.execute.mockResolvedValue({
      plan: { code: 'PREMIUM' } as never,
      features: [
        { code: 'PET_MEDICAL' } as never,
        { code: 'MULTIPLE_CONTACTS' } as never,
      ],
    })

    const result = await controller.features(user)

    expect(result).toEqual({
      code: 'PREMIUM',
      features: ['PET_MEDICAL', 'MULTIPLE_CONTACTS'],
    })
    expect(getUserPlanFeatures.execute).toHaveBeenCalledWith('user-1')
  })

  it('features: retorna code null e features vazias sem assinatura', async () => {
    getUserPlanFeatures.execute.mockResolvedValue({ plan: null, features: [] })

    const result = await controller.features(user)

    expect(result).toEqual({ code: null, features: [] })
  })

  it('cancel: delega e mapeia a assinatura cancelada', async () => {
    cancel.execute.mockResolvedValue(makeSubscription())

    const result = await controller.cancelRoute(user)

    expect(cancel.execute).toHaveBeenCalledWith('user-1')
    expect(result).toMatchObject({ id: 'sub-1', status: 'ACTIVE' })
  })
})
