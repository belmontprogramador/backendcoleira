import type { PaymentTransaction } from '../entities/payment-transaction.entity'
import type { PaymentProvider } from '../value-objects/payment-provider.vo'

/**
 * Porta do repositório de transações de pagamento (reconciliação financeira).
 */
export interface PaymentTransactionRepositoryPort {
  save(transaction: PaymentTransaction): Promise<void>
  findByProviderPaymentId(
    provider: PaymentProvider,
    providerPaymentId: string,
  ): Promise<PaymentTransaction | null>
}

export const PAYMENT_TRANSACTION_REPOSITORY_PORT = Symbol(
  'PAYMENT_TRANSACTION_REPOSITORY_PORT',
)
