import 'dotenv/config'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../database/prisma.service'
import { BcryptPasswordHasher } from '../../crypto/bcrypt-password.hasher'
import { SeedRunner } from '../seed.runner'

describe('SeedRunner (integração)', () => {
  let prisma: PrismaService
  let runner: SeedRunner

  function makeConfig(overrides: Record<string, string> = {}): ConfigService {
    return {
      getOrThrow: (key: string) => {
        const map: Record<string, string> = {
          DATABASE_URL: process.env.DATABASE_URL ?? '',
          SUPER_ADMIN_PASSWORD: 'TestSuper@123',
          ADMIN_PASSWORD: 'TestAdmin@123',
          SYSTEM_USER_PASSWORD: 'TestSystem@123',
          ...overrides,
        }
        const value = map[key]
        if (!value) {
          throw new Error(`Missing env var: ${key}`)
        }
        return value
      },
    } as unknown as ConfigService
  }

  const config = makeConfig()

  beforeAll(() => {
    prisma = new PrismaService(config)
    runner = new SeedRunner(prisma, new BcryptPasswordHasher(), config)
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    // Fase 7 — ordem FK-aware (novas tabelas primeiro)
    await prisma.paymentTransaction.deleteMany()
    await prisma.subscription.deleteMany()
    await prisma.planFeature.deleteMany()
    await prisma.plan.deleteMany()
    await prisma.feature.deleteMany()
    await prisma.webhookEvent.deleteMany()
    await prisma.petContact.deleteMany()
    await prisma.petMedical.deleteMany()
    // Fases anteriores
    await prisma.accessEvent.deleteMany()
    await prisma.contactMessage.deleteMany()
    await prisma.nfcTag.deleteMany()
    await prisma.batch.deleteMany()
    await prisma.petPrivacy.deleteMany()
    await prisma.pet.deleteMany()
    await prisma.rolePermission.deleteMany()
    await prisma.userRole.deleteMany()
    await prisma.permission.deleteMany()
    await prisma.role.deleteMany()
    await prisma.user.deleteMany()
  })

  it('cria as 5 roles', async () => {
    await runner.run()

    const roles = await prisma.role.findMany()
    const names = roles.map(r => r.name).sort()
    expect(names).toEqual(
      ['ADMIN', 'OPERATOR', 'SUPER_ADMIN', 'SUPPORT', 'USER'].sort(),
    )
  })

  it('cria permissões e associa conforme a matriz', async () => {
    await runner.run()

    // tag:record deve ser exclusivo de OPERATOR
    const operator = await prisma.role.findUniqueOrThrow({
      where: { name: 'OPERATOR' },
      include: { permissions: { include: { permission: true } } },
    })
    const operatorPerms = operator.permissions.map(p => p.permission.code)
    expect(operatorPerms).toContain('tag:record')

    const admin = await prisma.role.findUniqueOrThrow({
      where: { name: 'ADMIN' },
      include: { permissions: { include: { permission: true } } },
    })
    const adminPerms = admin.permissions.map(p => p.permission.code)
    expect(adminPerms).not.toContain('tag:record')
    expect(adminPerms).toContain('user:status')
  })

  it('cria SUPER_ADMIN e ADMIN padrão', async () => {
    await runner.run()

    const superAdmin = await prisma.user.findUnique({
      where: { email: 'superadmin@coleira.com' },
      include: { roles: { include: { role: true } } },
    })
    expect(superAdmin).not.toBeNull()
    expect(superAdmin?.roles.map(r => r.role.name)).toContain('SUPER_ADMIN')
    expect(superAdmin?.status).toBe('ACTIVE')

    const admin = await prisma.user.findUnique({
      where: { email: 'admin@coleira.com' },
    })
    expect(admin).not.toBeNull()
  })

  it('cria os 2 planos e associa as 3 features ao Premium', async () => {
    await runner.run()

    const plans = await prisma.plan.findMany({ orderBy: { code: 'asc' } })
    expect(plans.map(p => p.code)).toEqual(['BASIC', 'PREMIUM'])

    const basic = plans.find(p => p.code === 'BASIC')
    expect(basic?.price_cents).toBe(0)
    expect(basic?.is_default).toBe(true)

    const premium = plans.find(p => p.code === 'PREMIUM')
    expect(premium?.price_cents).toBe(1990)
    expect(premium?.is_default).toBe(false)

    const features = await prisma.feature.findMany({ orderBy: { code: 'asc' } })
    expect(features.map(f => f.code)).toEqual([
      'ACCESS_HISTORY',
      'MULTIPLE_CONTACTS',
      'PET_MEDICAL',
    ])

    const premiumFeatures = await prisma.planFeature.findMany({
      where: { plan_id: premium?.id },
      include: { feature: true },
    })
    expect(premiumFeatures.map(pf => pf.feature.code).sort()).toEqual(
      ['ACCESS_HISTORY', 'MULTIPLE_CONTACTS', 'PET_MEDICAL'].sort(),
    )

    const basicFeatures = await prisma.planFeature.count({
      where: { plan_id: basic?.id },
    })
    expect(basicFeatures).toBe(0)
  })

  it('cria o usuário de demonstração com 2 pets e assinatura Premium', async () => {
    await runner.run()

    const user = await prisma.user.findUnique({
      where: { email: 'sistema@coleira.com' },
      include: { roles: { include: { role: true } } },
    })
    expect(user).not.toBeNull()
    expect(user?.status).toBe('ACTIVE')
    expect(user?.email_verified_at).not.toBeNull()
    expect(user?.roles.map(r => r.role.name)).toContain('USER')

    const pets = await prisma.pet.findMany({
      where: { owner_id: user!.id },
      orderBy: { name: 'asc' },
      include: { privacy: true },
    })
    expect(pets).toHaveLength(2)
    expect(pets.map(p => p.name)).toEqual(['Luna', 'Thor'])
    expect(pets.every(p => p.privacy !== null)).toBe(true)
    expect(pets.every(p => p.deleted_at === null)).toBe(true)

    const subscription = await prisma.subscription.findFirst({
      where: { user_id: user!.id },
      include: { plan: true },
    })
    expect(subscription).not.toBeNull()
    expect(subscription?.plan.code).toBe('PREMIUM')
    expect(subscription?.status).toBe('ACTIVE')
  })

  it('é idempotente (rodar duas vezes não duplica)', async () => {
    await runner.run()
    await runner.run()

    const roles = await prisma.role.count()
    const permissions = await prisma.permission.count()
    const plans = await prisma.plan.count()
    const features = await prisma.feature.count()
    const superAdmins = await prisma.user.count({
      where: { email: 'superadmin@coleira.com' },
    })

    expect(roles).toBe(5)
    expect(permissions).toBe(20)
    expect(plans).toBe(2)
    expect(features).toBe(3)
    expect(superAdmins).toBe(1)

    const systemUser = await prisma.user.count({
      where: { email: 'sistema@coleira.com' },
    })
    const demoPets = await prisma.pet.count({
      where: { id: { in: ['demo-pet-thor', 'demo-pet-luna'] } },
    })
    const demoSubscriptions = await prisma.subscription.count({
      where: { id: 'demo-sub-premium' },
    })
    expect(systemUser).toBe(1)
    expect(demoPets).toBe(2)
    expect(demoSubscriptions).toBe(1)
  })

  it('falha (fail-closed) quando as senhas de admin não estão configuradas', async () => {
    const strictConfig = makeConfig({
      SUPER_ADMIN_PASSWORD: '',
      ADMIN_PASSWORD: '',
    })
    const strictRunner = new SeedRunner(
      prisma,
      new BcryptPasswordHasher(),
      strictConfig,
    )

    await expect(strictRunner.run()).rejects.toThrow(
      'Missing env var: SUPER_ADMIN_PASSWORD',
    )
  })
})
