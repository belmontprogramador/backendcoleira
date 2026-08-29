import { PaymentTransaction } from '../payment-transaction.entity'
import { Price } from '../../../../../common/value-objects/price.vo'

describe('PaymentTransaction (entidade)', () => {
  it('cria com status PENDING por padrão', () => {
    const tx = PaymentTransaction.create({
      id: 'tx-1',
      userId: 'user-1',
      planId: 'plan-1',
      provider: 'MERCADO_PAGO',
      providerPaymentId: 'mp-123',
      paymentMethod: 'PIX',
      amount: Price.create(1990),
    })

    expect(tx.status).toBe('PENDING')
    expect(tx.amount.amountInCents).toBe(1990)
    expect(tx.paymentMethod).toBe('PIX')
    expect(tx.subscriptionId).toBeNull()
  })

  it('transiciona para APPROVED / REJECTED / REFUNDED', () => {
    const tx = PaymentTransaction.create({
      id: 'tx-1',
      userId: 'user-1',
      provider: 'MERCADO_PAGO',
      providerPaymentId: 'mp-123',
      paymentMethod: 'CARD',
      amount: Price.create(1990),
    })

    tx.markApproved()
    expect(tx.status).toBe('APPROVED')

    tx.markRejected()
    expect(tx.status).toBe('REJECTED')

    tx.markRefunded()
    expect(tx.status).toBe('REFUNDED')
  })

  it('associa uma subscription', () => {
    const tx = PaymentTransaction.create({
      id: 'tx-1',
      userId: 'user-1',
      provider: 'MERCADO_PAGO',
      providerPaymentId: 'mp-123',
      paymentMethod: 'BOLETO',
      amount: Price.create(1990),
    })

    tx.linkSubscription('sub-1')
    expect(tx.subscriptionId).toBe('sub-1')
  })

  it('reconstitui uma transação persistida', () => {
    const now = new Date()
    const tx = PaymentTransaction.reconstitute({
      id: 'tx-1',
      userId: 'user-1',
      planId: null,
      subscriptionId: 'sub-1',
      provider: 'MERCADO_PAGO',
      providerPaymentId: 'mp-123',
      paymentMethod: 'PIX',
      amount: Price.create(1990),
      status: 'APPROVED',
      createdAt: now,
      updatedAt: now,
    })

    expect(tx.status).toBe('APPROVED')
    expect(tx.subscriptionId).toBe('sub-1')
  })
})
