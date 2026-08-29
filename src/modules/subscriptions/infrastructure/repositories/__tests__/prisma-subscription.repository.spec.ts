import 'dotenv/config'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../../../../infrastructure/database/prisma.service'
import { PrismaSubscriptionRepository } from '../prisma-subscription.repository'
import { Subscription } from '../../../domain/entities/subscription.entity'
import { SubscriptionPeriod } from '../../../domain/value-objects/subscription-period.vo'

const start = new Date('2026-08-28T00:00:00.000Z')
const end = new Date('2026-09-28T00:00:00.000Z')

describe('Subscription — repositório (integração)', () => {
  let prisma: PrismaService
  let repo: PrismaSubscriptionRepository

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
    repo = new PrismaSubscriptionRepository(prisma)
  })

  afterAll(async () => {
    await prisma.subscription.deleteMany()
    await prisma.plan.deleteMany()
    await prisma.user.deleteMany()
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    await prisma.subscription.deleteMany()
    await prisma.plan.deleteMany()
    await prisma.user.deleteMany()
  })

  it('save persiste e findById recupera', async () => {
    await seedUserAndPlan()
    const sub = Subscription.create({
      id: 'sub-1',
      userId: 'user-1',
      planId: 'plan-1',
      period: SubscriptionPeriod.create(start, end),
    })

    await repo.save(sub)
    const found = await repo.findById('sub-1')

    expect(found?.id).toBe('sub-1')
    expect(found?.status).toBe('ACTIVE')
    expect(found?.planId).toBe('plan-1')
    expect(found?.currentPeriodStart).toEqual(start)
    expect(found?.currentPeriodEnd).toEqual(end)
  })

  it('findByUserId retorna a mais recente', async () => {
    await seedUserAndPlan()
    const older = Subscription.create({
      id: 'sub-old',
      userId: 'user-1',
      planId: 'plan-1',
      period: SubscriptionPeriod.create(start, end),
    })
    await repo.save(older)

    const newer = Subscription.create({
      id: 'sub-new',
      userId: 'user-1',
      planId: 'plan-1',
      period: SubscriptionPeriod.create(
        new Date('2026-10-01T00:00:00.000Z'),
        new Date('2026-11-01T00:00:00.000Z'),
      ),
    })
    await repo.save(newer)

    const found = await repo.findByUserId('user-1')
    expect(found?.id).toBe('sub-new')
  })

  it('findActiveByUserId retorna apenas assinatura ativa', async () => {
    await seedUserAndPlan()
    const active = Subscription.create({
      id: 'sub-active',
      userId: 'user-1',
      planId: 'plan-1',
      period: SubscriptionPeriod.create(start, end),
    })
    await repo.save(active)

    const cancelled = Subscription.create({
      id: 'sub-cancelled',
      userId: 'user-1',
      planId: 'plan-1',
      period: SubscriptionPeriod.create(start, end),
    })
    cancelled.cancel()
    await repo.save(cancelled)

    const found = await repo.findActiveByUserId('user-1')
    expect(found?.id).toBe('sub-active')
  })

  it('findActiveByUserId retorna null sem assinatura ativa', async () => {
    await seedUserAndPlan()
    const cancelled = Subscription.create({
      id: 'sub-1',
      userId: 'user-1',
      planId: 'plan-1',
      period: SubscriptionPeriod.create(start, end),
    })
    cancelled.cancel()
    await repo.save(cancelled)

    expect(await repo.findActiveByUserId('user-1')).toBeNull()
  })
})
