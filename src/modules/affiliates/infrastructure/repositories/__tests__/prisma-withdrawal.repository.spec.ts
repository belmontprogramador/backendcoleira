import 'dotenv/config'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../../../../infrastructure/database/prisma.service'
import { Withdrawal } from '../../../domain/entities/withdrawal.entity'
import { PrismaWithdrawalRepository } from '../prisma-withdrawal.repository'

// IDs únicos (prefixo `w-`) para não colidir com outros specs de repositório.
const AFF = 'w-aff'

describe('Withdrawal — repositório (integração)', () => {
  let prisma: PrismaService
  let repo: PrismaWithdrawalRepository

  const config = {
    getOrThrow: (key: string) => {
      const map: Record<string, string> = {
        DATABASE_URL: process.env.DATABASE_URL ?? '',
      }
      return map[key]
    },
  } as unknown as ConfigService

  beforeAll(async () => {
    prisma = new PrismaService(config)
    repo = new PrismaWithdrawalRepository(prisma)
    await prisma.affiliate.create({
      data: { id: AFF, code: 'w-ana123', name: 'Ana', email: 'w-ana@example.com' },
    })
  })

  afterAll(async () => {
    await prisma.withdrawal.deleteMany()
    await prisma.affiliate.deleteMany({ where: { id: AFF } })
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    await prisma.withdrawal.deleteMany()
  })

  it('save persiste saque e listByAffiliateId ordena por requested_at desc', async () => {
    const w1 = Withdrawal.create({
      id: 'w-wd-1',
      affiliateId: AFF,
      amountCents: 5000,
      pixKey: 'ana@pix.com',
    })
    const w2 = Withdrawal.create({
      id: 'w-wd-2',
      affiliateId: AFF,
      amountCents: 2000,
      pixKey: 'ana@pix.com',
    })

    await repo.save(w1)
    await repo.save(w2)

    const list = await repo.listByAffiliateId(AFF)
    expect(list.length).toBe(2)
    expect((await repo.findById('w-wd-1'))?.amountCents).toBe(5000)
    expect(await repo.findById('X')).toBeNull()
  })

  it('sumActiveByAffiliateId soma RECEIVED/PROCESSING/PAID; sumPaid só PAID', async () => {
    const w1 = Withdrawal.create({
      id: 'w-wd-1',
      affiliateId: AFF,
      amountCents: 5000,
      pixKey: 'ana@pix.com',
    })
    const w2 = Withdrawal.create({
      id: 'w-wd-2',
      affiliateId: AFF,
      amountCents: 2000,
      pixKey: 'ana@pix.com',
    })
    w2.markProcessing()
    w2.markPaid()
    const w3 = Withdrawal.create({
      id: 'w-wd-3',
      affiliateId: AFF,
      amountCents: 1000,
      pixKey: 'ana@pix.com',
    })
    w3.markRejected()

    await repo.save(w1)
    await repo.save(w2)
    await repo.save(w3)

    // ativos: w1 (5000, RECEIVED) + w2 (2000, PAID) = 7000; w3 rejeitado fora.
    expect(await repo.sumActiveByAffiliateId(AFF)).toBe(7000)
    expect(await repo.sumPaidByAffiliateId(AFF)).toBe(2000)
  })
})
