import 'dotenv/config'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../../../../infrastructure/database/prisma.service'
import { PrismaFeatureRepository } from '../prisma-feature.repository'

describe('Feature — repositório (integração)', () => {
  let prisma: PrismaService
  let repo: PrismaFeatureRepository

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
    repo = new PrismaFeatureRepository(prisma)
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

  it('findByCode retorna a feature', async () => {
    await prisma.feature.create({
      data: { id: 'feat-1', code: 'PET_MEDICAL', name: 'Dados médicos' },
    })

    const feature = await repo.findByCode('PET_MEDICAL')
    expect(feature?.id).toBe('feat-1')
    expect(feature?.name).toBe('Dados médicos')
  })

  it('findByPlanId retorna as features do plano via PlanFeature', async () => {
    await prisma.feature.createMany({
      data: [
        { id: 'feat-1', code: 'PET_MEDICAL', name: 'Dados' },
        { id: 'feat-2', code: 'ACCESS_HISTORY', name: 'Histórico' },
        { id: 'feat-3', code: 'MULTIPLE_CONTACTS', name: 'Contatos' },
      ],
    })
    await prisma.plan.create({
      data: {
        id: 'plan-1',
        code: 'PREMIUM',
        name: 'Premium',
        price_cents: 1990,
      },
    })
    await prisma.planFeature.createMany({
      data: [
        { plan_id: 'plan-1', feature_id: 'feat-1' },
        { plan_id: 'plan-1', feature_id: 'feat-2' },
      ],
    })

    const features = await repo.findByPlanId('plan-1')

    expect(features).toHaveLength(2)
    const codes = features.map(f => f.code).sort()
    expect(codes).toEqual(['ACCESS_HISTORY', 'PET_MEDICAL'])
  })

  it('findByPlanId retorna vazio para plano sem features', async () => {
    const features = await repo.findByPlanId('plan-x')
    expect(features).toHaveLength(0)
  })

  it('findByCode retorna null quando não existe', async () => {
    expect(await repo.findByCode('X')).toBeNull()
  })
})
