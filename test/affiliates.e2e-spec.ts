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

describe('Affiliates (e2e)', () => {
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

    await prisma.role.create({ data: { name: 'SUPER_ADMIN' } })
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

    const client = await prisma.user.create({
      data: {
        id: 'client-1',
        name: 'Client',
        email: 'client@email.com',
        password_hash: await bcrypt.hash('clientSenha123', 12),
        status: 'ACTIVE',
      },
    })
    await prisma.userRole.create({
      data: { user_id: client.id, role_id: userRole.id },
    })
  })

  async function login(email: string, password: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200)
    return (res.body as AuthBody).accessToken
  }

  it('admin cria, lista, edita e consulta métricas de afiliado', async () => {
    const token = await login('admin@email.com', 'adminSenha123')

    const created = await request(app.getHttpServer())
      .post('/admin/affiliates')
      .set('Authorization', `Bearer ${token}`)
      .send({
        code: 'ana123',
        name: 'Ana Souza',
        email: 'ana@example.com',
        pixKey: 'ana@pix.com',
        saleCommissionType: 'PERCENTAGE',
        saleCommissionFixedCents: 0,
        saleCommissionPercentBps: 1000,
        subscriptionCommissionType: 'FIXED',
        subscriptionCommissionFixedCents: 500,
        subscriptionCommissionPercentBps: 0,
        minWithdrawalCents: 2000,
      })
      .expect(201)

    const affiliateId = (created.body as { id: string }).id
    expect((created.body as { code: string }).code).toBe('ana123')
    expect(
      (created.body as { saleCommission: { percentBps: number } })
        .saleCommission,
    ).toMatchObject({ percentBps: 1000 })

    const list = await request(app.getHttpServer())
      .get('/admin/affiliates')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect((list.body as { meta: { total: number } }).meta.total).toBe(1)

    const updated = await request(app.getHttpServer())
      .patch(`/admin/affiliates/${affiliateId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Ana Beltrão', minWithdrawalCents: 5000 })
      .expect(200)

    expect((updated.body as { name: string }).name).toBe('Ana Beltrão')
    expect(
      (updated.body as { minWithdrawalCents: number }).minWithdrawalCents,
    ).toBe(5000)

    const metrics = await request(app.getHttpServer())
      .get(`/admin/affiliates/${affiliateId}/metrics`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect((metrics.body as { sales: { count: number } }).sales.count).toBe(0)
  })

  it('afiliado vê perfil, solicita saque e admin avança o status', async () => {
    // Cria o vínculo Affiliate ↔ client-1 (com pix e piso baixo) + comissão.
    const affiliate = await prisma.affiliate.create({
      data: {
        id: 'aff-1',
        user_id: 'client-1',
        code: 'bia456',
        name: 'Bia',
        email: 'bia@example.com',
        pix_key: 'bia@pix.com',
        min_withdrawal_cents: 100,
      },
    })
    await prisma.commission.create({
      data: {
        id: 'com-1',
        affiliate_id: 'aff-1',
        source: 'ORDER',
        base_amount_cents: 10000,
        commission_type: 'PERCENTAGE',
        fixed_cents: 0,
        percent_bps: 1000,
        amount_cents: 1000,
        status: 'AVAILABLE',
      },
    })

    const token = await login('client@email.com', 'clientSenha123')

    const me = await request(app.getHttpServer())
      .get('/affiliate/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect((me.body as { code: string }).code).toBe('bia456')

    const myMetrics = await request(app.getHttpServer())
      .get('/affiliate/me/metrics')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect((myMetrics.body as { availableCents: number }).availableCents).toBe(
      1000,
    )

    const withdrawal = await request(app.getHttpServer())
      .post('/affiliate/me/withdrawals')
      .set('Authorization', `Bearer ${token}`)
      .send({ amountCents: 500 })
      .expect(201)

    const withdrawalId = (withdrawal.body as { id: string }).id
    expect((withdrawal.body as { status: string }).status).toBe('RECEIVED')

    const myWithdrawals = await request(app.getHttpServer())
      .get('/affiliate/me/withdrawals')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect((myWithdrawals.body as unknown[]).length).toBe(1)

    // Admin avança RECEIVED → PROCESSING → PAID.
    const adminToken = await login('admin@email.com', 'adminSenha123')

    const processing = await request(app.getHttpServer())
      .patch(`/admin/withdrawals/${withdrawalId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'PROCESSING' })
      .expect(200)

    expect((processing.body as { status: string }).status).toBe('PROCESSING')

    const paid = await request(app.getHttpServer())
      .patch(`/admin/withdrawals/${withdrawalId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'PAID' })
      .expect(200)

    expect((paid.body as { status: string }).status).toBe('PAID')
    expect(affiliate.id).toBe('aff-1')
  })

  it('usuário sem perfil de afiliado recebe 403', async () => {
    const token = await login('client@email.com', 'clientSenha123')

    await request(app.getHttpServer())
      .get('/affiliate/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(403)
  })

  it('afiliado não saca abaixo do piso (400)', async () => {
    await prisma.affiliate.create({
      data: {
        id: 'aff-2',
        user_id: 'client-1',
        code: 'ca1234',
        name: 'Ca',
        email: 'ca@example.com',
        pix_key: 'ca@pix.com',
        min_withdrawal_cents: 2000,
      },
    })

    const token = await login('client@email.com', 'clientSenha123')

    await request(app.getHttpServer())
      .post('/affiliate/me/withdrawals')
      .set('Authorization', `Bearer ${token}`)
      .send({ amountCents: 500 })
      .expect(400)
  })
})
