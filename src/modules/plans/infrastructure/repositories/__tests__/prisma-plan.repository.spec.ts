import 'dotenv/config'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../../../../infrastructure/database/prisma.service'
import { PrismaPlanRepository } from '../prisma-plan.repository'

describe('Plan — repositório (integração)', () => {
  let prisma: PrismaService
  let repo: PrismaPlanRepository

  const config = {
    getOrThrow: (key: string) => {
      const map: Record<string, string> = {
        DATABASE_URL: process.env.DATABASE_URL ?? '',
      }
      return map[key]
    },
  } as unknown as ConfigService

  beforeAll(() => {
    prisma = new PrismaService(config)
    repo = new PrismaPlanRepository(prisma)
  })

  afterAll(async () => {
    await prisma.planFeature.deleteMany()
    await prisma.subscription.deleteMany()
    await prisma.plan.deleteMany()
    await prisma.feature.deleteMany()
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    await prisma.planFeature.deleteMany()
    await prisma.subscription.deleteMany()
    await prisma.plan.deleteMany()
    await prisma.feature.deleteMany()
  })

  it('findAll retorna planos ordenados por preço', async () => {
    await prisma.plan.createMany({
      data: [
        {
          id: 'plan-1',
          code: 'PREMIUM',
          name: 'Premium',
          price_cents: 1990,
        },
        {
          id: 'plan-2',
          code: 'BASIC',
          name: 'Basic',
          price_cents: 0,
          is_default: true,
        },
      ],
    })

    const plans = await repo.findAll()

    expect(plans).toHaveLength(2)
    expect(plans[0].code).toBe('BASIC')
    expect(plans[1].code).toBe('PREMIUM')
  })

  it('findByCode e findById retornam o plano', async () => {
    await prisma.plan.create({
      data: {
        id: 'plan-1',
        code: 'PREMIUM',
        name: 'Premium',
        price_cents: 1990,
      },
    })

    const byCode = await repo.findByCode('PREMIUM')
    expect(byCode?.id).toBe('plan-1')
    expect(byCode?.price.amountInCents).toBe(1990)

    const byId = await repo.findById('plan-1')
    expect(byId?.code).toBe('PREMIUM')
  })

  it('findDefault retorna o plano default', async () => {
    await prisma.plan.createMany({
      data: [
        {
          id: 'plan-1',
          code: 'BASIC',
          name: 'Basic',
          price_cents: 0,
          is_default: true,
        },
        {
          id: 'plan-2',
          code: 'PREMIUM',
          name: 'Premium',
          price_cents: 1990,
        },
      ],
    })

    const def = await repo.findDefault()
    expect(def?.code).toBe('BASIC')
  })

  it('retorna null quando não encontra', async () => {
    expect(await repo.findById('x')).toBeNull()
    expect(await repo.findByCode('X')).toBeNull()
    expect(await repo.findDefault()).toBeNull()
  })
})
