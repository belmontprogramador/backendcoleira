import 'dotenv/config'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../../../../infrastructure/database/prisma.service'
import { PrismaSubscriptionRepository } from '../prisma-subscription.repository'
import { Subscription } from '../../../domain/entities/subscription.entity'
import { SubscriptionPeriod } from '../../../domain/value-objects/subscription-period.vo'
import { cleanDatabase } from '../../../../../../test/helpers/clean-database'

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
    await cleanDatabase(prisma)
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    await cleanDatabase(prisma)
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

  it('list retorna página (skip/take) ordenada por created_at desc', async () => {
    await seedUserAndPlan()
    const older = Subscription.reconstitute({
      id: 'sub-old',
      userId: 'user-1',
      planId: 'plan-1',
      provider: 'MERCADO_PAGO',
      providerCustomerId: null,
      providerSubscriptionId: null,
      status: 'ACTIVE',
      startedAt: start,
      currentPeriodStart: start,
      currentPeriodEnd: end,
      cancelledAt: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    })
    const newer = Subscription.reconstitute({
      id: 'sub-new',
      userId: 'user-1',
      planId: 'plan-1',
      provider: 'MERCADO_PAGO',
      providerCustomerId: null,
      providerSubscriptionId: null,
      status: 'ACTIVE',
      startedAt: start,
      currentPeriodStart: start,
      currentPeriodEnd: end,
      cancelledAt: null,
      createdAt: new Date('2026-02-01T00:00:00.000Z'),
      updatedAt: new Date('2026-02-01T00:00:00.000Z'),
    })
    await repo.save(older)
    await repo.save(newer)

    const page1 = await repo.list({ page: 1, limit: 1 })
    expect(page1.map(s => s.id)).toEqual(['sub-new'])

    const page2 = await repo.list({ page: 2, limit: 1 })
    expect(page2.map(s => s.id)).toEqual(['sub-old'])
  })

  it('list filtra por status', async () => {
    await seedUserAndPlan()
    await repo.save(
      Subscription.create({
        id: 'sub-active',
        userId: 'user-1',
        planId: 'plan-1',
        period: SubscriptionPeriod.create(start, end),
      }),
    )
    const cancelled = Subscription.create({
      id: 'sub-cancelled',
      userId: 'user-1',
      planId: 'plan-1',
      period: SubscriptionPeriod.create(start, end),
    })
    cancelled.cancel()
    await repo.save(cancelled)

    const result = await repo.list({ page: 1, limit: 10, status: 'CANCELLED' })
    expect(result.map(s => s.id)).toEqual(['sub-cancelled'])
  })

  it('list filtra por planCode', async () => {
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
    await prisma.plan.create({
      data: {
        id: 'plan-2',
        code: 'BASIC',
        name: 'Basic',
        price_cents: 0,
        is_default: true,
      },
    })

    await repo.save(
      Subscription.create({
        id: 'sub-p',
        userId: 'user-1',
        planId: 'plan-1',
        period: SubscriptionPeriod.create(start, end),
      }),
    )
    await repo.save(
      Subscription.create({
        id: 'sub-b',
        userId: 'user-1',
        planId: 'plan-2',
        period: SubscriptionPeriod.create(start, end),
      }),
    )

    const result = await repo.list({ page: 1, limit: 10, planCode: 'PREMIUM' })
    expect(result.map(s => s.id)).toEqual(['sub-p'])
  })

  it('list filtra por userId', async () => {
    await seedUserAndPlan()
    await prisma.user.create({
      data: {
        id: 'user-2',
        name: 'Owner2',
        email: 'owner2@email.com',
        password_hash: 'x',
        status: 'ACTIVE',
      },
    })

    await repo.save(
      Subscription.create({
        id: 'sub-1',
        userId: 'user-1',
        planId: 'plan-1',
        period: SubscriptionPeriod.create(start, end),
      }),
    )
    await repo.save(
      Subscription.create({
        id: 'sub-2',
        userId: 'user-2',
        planId: 'plan-1',
        period: SubscriptionPeriod.create(start, end),
      }),
    )

    const result = await repo.list({ page: 1, limit: 10, userId: 'user-2' })
    expect(result.map(s => s.id)).toEqual(['sub-2'])
  })

  it('count retorna o total global (ignorando página)', async () => {
    await seedUserAndPlan()
    for (const id of ['sub-1', 'sub-2', 'sub-3']) {
      await repo.save(
        Subscription.create({
          id,
          userId: 'user-1',
          planId: 'plan-1',
          period: SubscriptionPeriod.create(start, end),
        }),
      )
    }

    expect(await repo.count({ page: 1, limit: 2 })).toBe(3)
  })
})
