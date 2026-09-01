import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import * as bcrypt from 'bcrypt'
import request from 'supertest'
import { App } from 'supertest/types'
import { AppModule } from './../src/app.module'
import { PrismaService } from './../src/infrastructure/database/prisma.service'
import { flushRedis } from './helpers/flush-redis'
import { cleanDatabase } from './helpers/clean-database'

type AuthBody = { accessToken: string; refreshToken: string }

type DashboardBody = {
  period: { from: string; to: string; granularity: string; days: number }
  kpis: {
    users: { total: number; active: number }
    pets: { total: number }
    subscriptions: { active: number; mrrCents: number; premiumCount: number }
    payments: { revenueCents: number; approvedCount: number }
    scans: { total: number }
    contacts: { total: number; unread: number }
    nfc: { totalTags: number; activeTags: number }
  }
  timeseries: {
    signups: Array<{ bucket: string; value: number }>
    revenue: Array<{ bucket: string; valueCents: number }>
  }
}

describe('Dashboard (e2e)', () => {
  let app: INestApplication<App>
  let prisma: PrismaService

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
    await cleanDatabase(prisma)

    // Roles + usuários de autenticação
    const adminRole = await prisma.role.create({ data: { name: 'ADMIN' } })
    const userRole = await prisma.role.create({ data: { name: 'USER' } })

    const admin = await prisma.user.create({
      data: {
        id: 'admin-1',
        name: 'Admin',
        email: 'admin@email.com',
        password_hash: await bcrypt.hash('adminSenha123', 12),
        status: 'ACTIVE',
      },
    })
    await prisma.userRole.create({
      data: { user_id: admin.id, role_id: adminRole.id },
    })

    const regular = await prisma.user.create({
      data: {
        id: 'regular-1',
        name: 'Regular',
        email: 'regular@email.com',
        password_hash: await bcrypt.hash('regularSenha123', 12),
        status: 'ACTIVE',
      },
    })
    await prisma.userRole.create({
      data: { user_id: regular.id, role_id: userRole.id },
    })
  })

  async function login(email: string, password: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200)
    return (res.body as AuthBody).accessToken
  }

  async function seedKpis(): Promise<void> {
    const now = new Date()

    await prisma.plan.create({
      data: {
        id: 'plan-premium',
        code: 'PREMIUM',
        name: 'Premium',
        price_cents: 1990,
      },
    })
    await prisma.plan.create({
      data: {
        id: 'plan-basic',
        code: 'BASIC',
        name: 'Basic',
        price_cents: 0,
        is_default: true,
      },
    })

    await prisma.subscription.create({
      data: {
        id: 'sub-1',
        user_id: 'regular-1',
        plan_id: 'plan-premium',
        status: 'ACTIVE',
        started_at: now,
        current_period_start: now,
        current_period_end: new Date(now.getTime() + 30 * 86_400_000),
      },
    })

    await prisma.paymentTransaction.create({
      data: {
        id: 'pay-1',
        user_id: 'regular-1',
        provider: 'MERCADO_PAGO',
        provider_payment_id: 'pay-1',
        payment_method: 'PIX',
        amount_cents: 1990,
        status: 'APPROVED',
        created_at: now,
      },
    })

    await prisma.pet.create({
      data: {
        id: 'pet-1',
        owner_id: 'regular-1',
        name: 'Thor',
        species: 'Cão',
        created_at: now,
      },
    })

    await prisma.nfcTag.create({
      data: {
        id: 'tag-1',
        public_id: 'PUB-1',
        activation_code_encrypted: 'x',
        status: 'ACTIVE',
        activated_at: now,
      },
    })

    await prisma.accessEvent.create({
      data: {
        id: 'evt-1',
        pet_id: 'pet-1',
        source: 'NFC',
        ip_hash: '1.1.1.1',
        created_at: now,
      },
    })

    await prisma.contactMessage.create({
      data: { id: 'msg-1', pet_id: 'pet-1', message: 'Oi', created_at: now },
    })
  }

  it('ADMIN obtém o dashboard agregado (KPIs + séries)', async () => {
    await seedKpis()
    const token = await login('admin@email.com', 'adminSenha123')

    const res = await request(app.getHttpServer())
      .get('/admin/dashboard')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    const body = res.body as DashboardBody
    expect(body.period.granularity).toBe('day')
    expect(body.period.days).toBe(30)

    expect(body.kpis.users.total).toBe(1) // só o cliente regular; admin (staff) fica fora
    expect(body.kpis.users.active).toBe(1)
    expect(body.kpis.pets.total).toBe(1)
    expect(body.kpis.subscriptions.active).toBe(1)
    expect(body.kpis.subscriptions.mrrCents).toBe(1990)
    expect(body.kpis.subscriptions.premiumCount).toBe(1)
    expect(body.kpis.payments.revenueCents).toBe(1990)
    expect(body.kpis.payments.approvedCount).toBe(1)
    expect(body.kpis.scans.total).toBe(1)
    expect(body.kpis.contacts.total).toBe(1)
    expect(body.kpis.contacts.unread).toBe(1)
    expect(body.kpis.nfc.totalTags).toBe(1)
    expect(body.kpis.nfc.activeTags).toBe(1)

    expect(Array.isArray(body.timeseries.signups)).toBe(true)
    expect(Array.isArray(body.timeseries.revenue)).toBe(true)
  })

  it('aceita filtro de período + granularidade', async () => {
    await seedKpis()
    const token = await login('admin@email.com', 'adminSenha123')

    const res = await request(app.getHttpServer())
      .get('/admin/dashboard?granularity=month&from=2026-08-01&to=2026-08-31')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    const body = res.body as DashboardBody
    expect(body.period.granularity).toBe('month')
  })

  it('rejeita data inválida (400)', async () => {
    const token = await login('admin@email.com', 'adminSenha123')

    await request(app.getHttpServer())
      .get('/admin/dashboard?from=abc')
      .set('Authorization', `Bearer ${token}`)
      .expect(400)
  })

  it('rejeita granularidade inválida (400)', async () => {
    const token = await login('admin@email.com', 'adminSenha123')

    await request(app.getHttpServer())
      .get('/admin/dashboard?granularity=hour')
      .set('Authorization', `Bearer ${token}`)
      .expect(400)
  })

  it('usuário comum (USER) não acessa o dashboard (403)', async () => {
    const token = await login('regular@email.com', 'regularSenha123')

    await request(app.getHttpServer())
      .get('/admin/dashboard')
      .set('Authorization', `Bearer ${token}`)
      .expect(403)
  })

  it('sem token retorna 401', async () => {
    await request(app.getHttpServer()).get('/admin/dashboard').expect(401)
  })
})
