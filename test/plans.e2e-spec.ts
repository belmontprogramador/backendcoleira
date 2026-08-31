import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import * as bcrypt from 'bcrypt'
import request from 'supertest'
import { App } from 'supertest/types'
import { AppModule } from './../src/app.module'
import { PrismaService } from './../src/infrastructure/database/prisma.service'
import { flushRedis } from './helpers/flush-redis'

type AuthBody = { accessToken: string; refreshToken: string }

describe('Admin Plans (e2e)', () => {
  let app: INestApplication<App>
  let prisma: PrismaService
  let premiumId: string

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()

    prisma = app.get(PrismaService)
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(async () => {
    await flushRedis(process.env.REDIS_URL ?? 'redis://localhost:6379')
    await prisma.paymentTransaction.deleteMany()
    await prisma.subscription.deleteMany()
    await prisma.planFeature.deleteMany()
    await prisma.plan.deleteMany()
    await prisma.feature.deleteMany()
    await prisma.webhookEvent.deleteMany()
    await prisma.nfcTag.deleteMany()
    await prisma.batch.deleteMany()
    await prisma.petPrivacy.deleteMany()
    await prisma.pet.deleteMany()
    await prisma.auditLog.deleteMany()
    await prisma.userRole.deleteMany()
    await prisma.rolePermission.deleteMany()
    await prisma.permission.deleteMany()
    await prisma.role.deleteMany()
    await prisma.user.deleteMany()

    const superRole = await prisma.role.create({
      data: { name: 'SUPER_ADMIN' },
    })
    const adminRole = await prisma.role.create({ data: { name: 'ADMIN' } })

    const premium = await prisma.plan.create({
      data: {
        code: 'PREMIUM',
        name: 'Premium',
        price_cents: 1990,
        interval: 'MONTHLY',
        interval_count: 1,
      },
    })
    premiumId = premium.id

    const superUser = await prisma.user.create({
      data: {
        id: 'super-1',
        name: 'Super',
        email: 'super@email.com',
        password_hash: await bcrypt.hash('superSenha123', 12),
        status: 'ACTIVE',
      },
    })
    await prisma.userRole.create({
      data: { user_id: superUser.id, role_id: superRole.id },
    })

    const adminUser = await prisma.user.create({
      data: {
        id: 'admin-1',
        name: 'Admin',
        email: 'admin@email.com',
        password_hash: await bcrypt.hash('adminSenha123', 12),
        status: 'ACTIVE',
      },
    })
    await prisma.userRole.create({
      data: { user_id: adminUser.id, role_id: adminRole.id },
    })
  })

  async function login(email: string, password: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200)
    return (res.body as AuthBody).accessToken
  }

  it('SUPER_ADMIN altera o preço do plano', async () => {
    const token = await login('super@email.com', 'superSenha123')

    const res = await request(app.getHttpServer())
      .patch(`/admin/plans/${premiumId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ priceCents: 2990 })
      .expect(200)

    expect((res.body as { priceCents: number }).priceCents).toBe(2990)

    const stored = await prisma.plan.findUnique({ where: { id: premiumId } })
    expect(stored?.price_cents).toBe(2990)
  })

  it('SUPER_ADMIN altera nome e descrição', async () => {
    const token = await login('super@email.com', 'superSenha123')

    const res = await request(app.getHttpServer())
      .patch(`/admin/plans/${premiumId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Premium Plus', description: 'Novo plano' })
      .expect(200)

    expect((res.body as { name: string }).name).toBe('Premium Plus')
  })

  it('ADMIN não pode alterar plano (403)', async () => {
    const token = await login('admin@email.com', 'adminSenha123')

    await request(app.getHttpServer())
      .patch(`/admin/plans/${premiumId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ priceCents: 1000 })
      .expect(403)
  })

  it('plano inexistente retorna 404', async () => {
    const token = await login('super@email.com', 'superSenha123')

    await request(app.getHttpServer())
      .patch('/admin/plans/nao-existe')
      .set('Authorization', `Bearer ${token}`)
      .send({ priceCents: 1000 })
      .expect(404)
  })

  it('rejeita preço negativo (400)', async () => {
    const token = await login('super@email.com', 'superSenha123')

    await request(app.getHttpServer())
      .patch(`/admin/plans/${premiumId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ priceCents: -1 })
      .expect(400)
  })

  it('GET /plans é público (sem token)', async () => {
    const res = await request(app.getHttpServer()).get('/plans').expect(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('rejeita corpo vazio (400)', async () => {
    const token = await login('super@email.com', 'superSenha123')

    await request(app.getHttpServer())
      .patch(`/admin/plans/${premiumId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(400)
  })
})
