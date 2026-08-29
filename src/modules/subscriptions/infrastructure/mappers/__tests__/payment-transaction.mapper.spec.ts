import { PaymentTransactionMapper } from '../payment-transaction.mapper'
import { PaymentTransaction } from '../../../domain/entities/payment-transaction.entity'
import { Price } from '../../../../../common/value-objects/price.vo'
import type { PaymentTransactionModel } from '../../../../../generated/prisma/models/PaymentTransaction'

describe('PaymentTransactionMapper', () => {
  it('converte domínio → persistência (snake_case)', () => {
    const tx = PaymentTransaction.create({
      id: 'tx-1',
      userId: 'user-1',
      planId: 'plan-1',
      provider: 'MERCADO_PAGO',
      providerPaymentId: 'mp-123',
      paymentMethod: 'PIX',
      amount: Price.create(1990),
    })

    const data = PaymentTransactionMapper.toPersistence(tx)

    expect(data.id).toBe('tx-1')
    expect(data.user_id).toBe('user-1')
    expect(data.plan_id).toBe('plan-1')
    expect(data.subscription_id).toBeNull()
    expect(data.provider).toBe('MERCADO_PAGO')
    expect(data.provider_payment_id).toBe('mp-123')
    expect(data.payment_method).toBe('PIX')
    expect(data.amount_cents).toBe(1990)
    expect(data.currency).toBe('BRL')
    expect(data.status).toBe('PENDING')
  })

  it('converte persistência → domínio', () => {
    const now = new Date('2026-01-01T00:00:00.000Z')
    const model = {
      id: 'tx-1',
      subscription_id: null,
      user_id: 'user-1',
      plan_id: 'plan-1',
      provider: 'MERCADO_PAGO',
      provider_payment_id: 'mp-123',
      payment_method: 'CARD',
      amount_cents: 1990,
      currency: 'BRL',
      status: 'APPROVED',
      created_at: now,
      updated_at: now,
    } as PaymentTransactionModel

    const tx = PaymentTransactionMapper.toDomain(model)

    expect(tx.id).toBe('tx-1')
    expect(tx.userId).toBe('user-1')
    expect(tx.amount.amountInCents).toBe(1990)
    expect(tx.amount.currency).toBe('BRL')
    expect(tx.status).toBe('APPROVED')
  })
})
