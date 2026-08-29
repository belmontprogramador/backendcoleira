import { PaymentTransaction } from '../../domain/entities/payment-transaction.entity'
import { Price } from '../../../../common/value-objects/price.vo'
import type { PriceCurrency } from '../../../../common/value-objects/price.vo'
import type { PaymentProvider } from '../../domain/value-objects/payment-provider.vo'
import type { PaymentMethod } from '../../domain/value-objects/payment-method.vo'
import type { PaymentStatus } from '../../domain/value-objects/payment-status.vo'
import type { PaymentTransactionModel } from '../../../../generated/prisma/models/PaymentTransaction'

/**
 * Converte a entidade `PaymentTransaction` (domínio) para o formato de
 * persistência Prisma (snake_case) e vice-versa.
 */
export class PaymentTransactionMapper {
  static toPersistence(tx: PaymentTransaction): {
    id: string
    subscription_id: string | null
    user_id: string
    plan_id: string | null
    provider: PaymentProvider
    provider_payment_id: string
    payment_method: PaymentMethod
    amount_cents: number
    currency: string
    status: PaymentStatus
    created_at: Date
    updated_at: Date
  } {
    return {
      id: tx.id,
      subscription_id: tx.subscriptionId,
      user_id: tx.userId,
      plan_id: tx.planId,
      provider: tx.provider,
      provider_payment_id: tx.providerPaymentId,
      payment_method: tx.paymentMethod,
      amount_cents: tx.amount.amountInCents,
      currency: tx.amount.currency,
      status: tx.status,
      created_at: tx.createdAt,
      updated_at: tx.updatedAt,
    }
  }

  static toDomain(model: PaymentTransactionModel): PaymentTransaction {
    return PaymentTransaction.reconstitute({
      id: model.id,
      userId: model.user_id,
      planId: model.plan_id,
      subscriptionId: model.subscription_id,
      provider: model.provider,
      providerPaymentId: model.provider_payment_id,
      paymentMethod: model.payment_method,
      amount: Price.create(model.amount_cents, model.currency as PriceCurrency),
      status: model.status,
      createdAt: model.created_at,
      updatedAt: model.updated_at,
    })
  }
}
