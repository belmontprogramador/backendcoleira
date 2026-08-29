import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../../infrastructure/database/prisma.service'
import type { PaymentTransaction } from '../../domain/entities/payment-transaction.entity'
import type { PaymentTransactionRepositoryPort } from '../../domain/repositories/payment-transaction.repository.port'
import { PaymentTransactionMapper } from '../mappers/payment-transaction.mapper'

/**
 * Implementação concreta do `PaymentTransactionRepositoryPort` usando Prisma 7.
 */
@Injectable()
export class PrismaPaymentTransactionRepository implements PaymentTransactionRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async save(transaction: PaymentTransaction): Promise<void> {
    const data = PaymentTransactionMapper.toPersistence(transaction)
    await this.prisma.paymentTransaction.upsert({
      where: { id: transaction.id },
      create: data,
      update: data,
    })
  }

  async findByProviderPaymentId(
    provider: PaymentTransaction['provider'],
    providerPaymentId: string,
  ): Promise<PaymentTransaction | null> {
    const model = await this.prisma.paymentTransaction.findUnique({
      where: {
        provider_provider_payment_id: {
          provider,
          provider_payment_id: providerPaymentId,
        },
      },
    })
    return model ? PaymentTransactionMapper.toDomain(model) : null
  }
}
