import 'dotenv/config'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../../../../infrastructure/database/prisma.service'
import { PrismaPaymentTransactionRepository } from '../prisma-payment-transaction.repository'
import { PaymentTransaction } from '../../../domain/entities/payment-transaction.entity'
import { Price } from '../../../../../common/value-objects/price.vo'
import { cleanDatabase } from '../../../../../../test/helpers/clean-database'

describe('PaymentTransaction — repositório (integração)', () => {
  let prisma: PrismaService
  let repo: PrismaPaymentTransactionRepository

  const config = {
    getOrThrow: (key: string) => {
      const map: Record<string, string> = {
        DATABASE_URL: process.env.DATABASE_URL ?? '',
      }
      return map[key]
    },
  } as unknown as ConfigService

  async function seedUserAndPlan(): Promise<void> {
    await prisma.user.create({
      data: {
        id: 'user-1',
        name: 'Owner',
        email: 'owner@email.com',
        password_hash: 'x',
        status: 'ACTIVE',
      },
    })
    await prisma.plan.create({
      data: {
        id: 'plan-1',
        code: 'PREMIUM',
        name: 'Premium',
        price_cents: 1990,
      },
    })
  }

  beforeAll(() => {
    prisma = new PrismaService(config)
    repo = new PrismaPaymentTransactionRepository(prisma)
  })

  afterAll(async () => {
    await cleanDatabase(prisma)
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    await cleanDatabase(prisma)
  })

  it('save persiste e findByProviderPaymentId recupera', async () => {
    await seedUserAndPlan()
    const tx = PaymentTransaction.create({
      id: 'tx-1',
      userId: 'user-1',
      planId: 'plan-1',
      provider: 'MERCADO_PAGO',
      providerPaymentId: 'mp-123',
      paymentMethod: 'PIX',
      amount: Price.create(1990),
    })

    await repo.save(tx)
    const found = await repo.findByProviderPaymentId('MERCADO_PAGO', 'mp-123')

    expect(found?.id).toBe('tx-1')
    expect(found?.amount.amountInCents).toBe(1990)
    expect(found?.status).toBe('PENDING')
  })

  it('findByProviderPaymentId retorna null quando não existe', async () => {
    expect(await repo.findByProviderPaymentId('MERCADO_PAGO', 'x')).toBeNull()
  })

  it('save atualiza transação existente (upsert)', async () => {
    await seedUserAndPlan()
    const tx = PaymentTransaction.create({
      id: 'tx-1',
      userId: 'user-1',
      planId: 'plan-1',
      provider: 'MERCADO_PAGO',
      providerPaymentId: 'mp-123',
      paymentMethod: 'PIX',
      amount: Price.create(1990),
    })
    await repo.save(tx)

    tx.markApproved()
    await repo.save(tx)

    const found = await repo.findByProviderPaymentId('MERCADO_PAGO', 'mp-123')
    expect(found?.status).toBe('APPROVED')
  })
})
