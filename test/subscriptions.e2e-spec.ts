import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import * as bcrypt from 'bcrypt'
import request from 'supertest'
import { App } from 'supertest/types'
import { AppModule } from './../src/app.module'
import { PrismaService } from './../src/infrastructure/database/prisma.service'
import { flushRedis } from './helpers/flush-redis'
import { createHmac } from 'node:crypto'

const WEBHOOK_SECRET = 'test-webhook-secret'

type AuthBody = { accessToken: string; refreshToken: string }
type SubscriptionBody = { id: string; planId: string; status: string }
type MedicalBody = { allergies: string | null; veterinarianName: string | null }
type ContactBody = { id: string; name: string; isPrimary: boolean }

describe('Planos, Assinaturas e Dados Premium (e2e)', () => {
  let app: INestApplication<App>
  let prisma: PrismaService
  let premiumPlanId: string
  let basicPlanId: string

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication({ rawBody: true })
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
    await prisma.petContact.deleteMany()
    await prisma.petMedical.deleteMany()
    await prisma.accessEvent.deleteMany()
    await prisma.contactMessage.deleteMany()
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

    const ids = await seedPlans()
    premiumPlanId = ids.premium
    basicPlanId = ids.basic
  })

  async function seedPlans(): Promise<{ premium: string; basic: string }> {
    const featureCodes = ['PET_MEDICAL', 'MULTIPLE_CONTACTS', 'ACCESS_HISTORY']
    for (const code of featureCodes) {
      await prisma.feature.upsert({
        where: { code },
        create: { code, name: code },
        update: {},
      })
    }

    const premium = await prisma.plan.upsert({
      where: { code: 'PREMIUM' },
      create: {
        code: 'PREMIUM',
        name: 'Premium',
        price_cents: 1990,
        interval: 'MONTHLY',
        interval_count: 1,
      },
      update: {},
    })
    const basic = await prisma.plan.upsert({
      where: { code: 'BASIC' },
      create: {
        code: 'BASIC',
        name: 'Basic',
        price_cents: 0,
        is_default: true,
        interval: 'MONTHLY',
        interval_count: 1,
      },
      update: {},
    })

    for (const code of featureCodes) {
      const feature = await prisma.feature.findUnique({ where: { code } })
      await prisma.planFeature.upsert({
        where: {
          plan_id_feature_id: {
            plan_id: premium.id,
            feature_id: feature!.id,
          },
        },
        create: { plan_id: premium.id, feature_id: feature!.id },
        update: {},
      })
    }

    return { premium: premium.id, basic: basic.id }
  }

  async function createUser(
    id: string,
    email: string,
    password: string,
  ): Promise<string> {
    await prisma.user.create({
      data: {
        id,
        name: `Dono ${email}`,
        email,
        password_hash: await bcrypt.hash(password, 12),
        status: 'ACTIVE',
      },
    })
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200)
    return (res.body as AuthBody).accessToken
  }

  async function createPet(token: string, name: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/pets')
      .set('Authorization', `Bearer ${token}`)
      .send({ name, species: 'Cão' })
      .expect(201)
    return (res.body as { id: string }).id
  }

  async function checkoutPremium(token: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/subscriptions/checkout')
      .set('Authorization', `Bearer ${token}`)
      .send({ planId: premiumPlanId, paymentMethod: 'PIX' })
      .expect(201)
    return (res.body as { providerPaymentId: string }).providerPaymentId
  }

  function signWebhook(payload: unknown): string {
    return createHmac('sha256', WEBHOOK_SECRET)
      .update(JSON.stringify(payload))
      .digest('hex')
  }

  function postWebhook(payload: unknown) {
    return request(app.getHttpServer())
      .post('/webhooks/payment')
      .set('x-signature', signWebhook(payload))
      .send(payload as object)
  }

  async function approveViaWebhook(providerPaymentId: string, eventId: string) {
    await postWebhook({
      id: eventId,
      type: 'payment',
      action: 'payment.updated',
      data: { id: providerPaymentId },
    }).expect(201)
  }

  async function activatePremium(token: string): Promise<void> {
    const providerPaymentId = await checkoutPremium(token)
    await approveViaWebhook(providerPaymentId, `ev-${providerPaymentId}`)
  }

  async function createAdmin(): Promise<string> {
    const role = await prisma.role.create({ data: { name: 'ADMIN' } })
    const user = await prisma.user.create({
      data: {
        id: 'admin-1',
        name: 'Admin',
        email: 'admin@email.com',
        password_hash: await bcrypt.hash('adminSenha123', 12),
        status: 'ACTIVE',
      },
    })
    await prisma.userRole.create({
      data: { user_id: user.id, role_id: role.id },
    })

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@email.com', password: 'adminSenha123' })
      .expect(200)
    return (res.body as AuthBody).accessToken
  }

  it('GET /plans lista Basic (default) e Premium com features', async () => {
    const token = await createUser('u1', 'dono1@email.com', 'senhaForte123')
    const res = await request(app.getHttpServer())
      .get('/plans')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    const plans = res.body as Array<{
      code: string
      priceCents: number
      isDefault: boolean
      features: Array<{ code: string }>
    }>

    expect(plans).toHaveLength(2)

    const basic = plans.find(p => p.code === 'BASIC')
    const premium = plans.find(p => p.code === 'PREMIUM')

    expect(basic?.isDefault).toBe(true)
    expect(basic?.priceCents).toBe(0)
    expect(basic?.features).toEqual([])

    expect(premium?.priceCents).toBe(1990)
    expect(premium?.features.map(f => f.code).sort()).toEqual(
      ['ACCESS_HISTORY', 'MULTIPLE_CONTACTS', 'PET_MEDICAL'].sort(),
    )
  })

  it('fluxo: checkout → webhook(approved) → ACTIVE → cancel', async () => {
    const token = await createUser('u1', 'dono1@email.com', 'senhaForte123')

    // Sem assinatura inicial.
    const before = await request(app.getHttpServer())
      .get('/subscriptions/current')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect((before.body as SubscriptionBody | null)?.status ?? null).toBeNull()

    const providerPaymentId = await checkoutPremium(token)

    // A Subscription só nasce no webhook — ainda null.
    const mid = await request(app.getHttpServer())
      .get('/subscriptions/current')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect((mid.body as SubscriptionBody | null)?.status ?? null).toBeNull()

    await approveViaWebhook(providerPaymentId, 'ev-1')

    const current = await request(app.getHttpServer())
      .get('/subscriptions/current')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect((current.body as SubscriptionBody).status).toBe('ACTIVE')
    expect((current.body as SubscriptionBody).planId).toBe(premiumPlanId)

    const cancel = await request(app.getHttpServer())
      .post('/subscriptions/cancel')
      .set('Authorization', `Bearer ${token}`)
      .expect(201)
    expect((cancel.body as SubscriptionBody).status).toBe('CANCELLED')
  })

  it('webhook é idempotente (event_id duplicado não duplica assinatura)', async () => {
    const token = await createUser('u1', 'dono1@email.com', 'senhaForte123')
    const providerPaymentId = await checkoutPremium(token)

    const payload = {
      id: 'ev-dup',
      type: 'payment',
      action: 'payment.updated',
      data: { id: providerPaymentId },
    }
    await postWebhook(payload).expect(201)
    await postWebhook(payload).expect(201)

    expect(await prisma.subscription.count()).toBe(1)
  })

  it('checkout do plano Basic (gratuito) retorna 400', async () => {
    const token = await createUser('u1', 'dono1@email.com', 'senhaForte123')

    await request(app.getHttpServer())
      .post('/subscriptions/checkout')
      .set('Authorization', `Bearer ${token}`)
      .send({ planId: basicPlanId, paymentMethod: 'PIX' })
      .expect(400)
  })

  it('webhook sem event_id retorna 400', async () => {
    await postWebhook({ status: 'approved' }).expect(400)
  })

  it('usuário Basic recebe 403 nas rotas premium (FeatureGuard)', async () => {
    const token = await createUser('u1', 'dono1@email.com', 'senhaForte123')
    const petId = await createPet(token, 'Thor')

    await request(app.getHttpServer())
      .get(`/pets/${petId}/medical`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403)
    await request(app.getHttpServer())
      .get(`/pets/${petId}/contacts`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403)
    await request(app.getHttpServer())
      .get(`/pets/${petId}/access-events`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403)
  })

  it('usuário Premium faz upsert/get de dados médicos', async () => {
    const token = await createUser('u1', 'dono1@email.com', 'senhaForte123')
    const petId = await createPet(token, 'Thor')
    await activatePremium(token)

    await request(app.getHttpServer())
      .put(`/pets/${petId}/medical`)
      .set('Authorization', `Bearer ${token}`)
      .send({ allergies: 'pólen', veterinarianName: 'Dr. Ana' })
      .expect(200)

    const res = await request(app.getHttpServer())
      .get(`/pets/${petId}/medical`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect((res.body as MedicalBody).allergies).toBe('pólen')
    expect((res.body as MedicalBody).veterinarianName).toBe('Dr. Ana')
  })

  it('usuário Premium gerencia múltiplos contatos', async () => {
    const token = await createUser('u1', 'dono1@email.com', 'senhaForte123')
    const petId = await createPet(token, 'Thor')
    await activatePremium(token)

    const created = await request(app.getHttpServer())
      .post(`/pets/${petId}/contacts`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Maria', relationship: 'Mãe', isPrimary: true })
      .expect(201)
    const contactId = (created.body as { id: string }).id

    const list = await request(app.getHttpServer())
      .get(`/pets/${petId}/contacts`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect(list.body).toHaveLength(1)
    expect((list.body as ContactBody[])[0].isPrimary).toBe(true)

    await request(app.getHttpServer())
      .patch(`/pets/${petId}/contacts/${contactId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Maria S.' })
      .expect(200)

    await request(app.getHttpServer())
      .delete(`/pets/${petId}/contacts/${contactId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204)

    const empty = await request(app.getHttpServer())
      .get(`/pets/${petId}/contacts`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect(empty.body).toEqual([])
  })

  it('usuário Premium lista histórico de acessos (vazio)', async () => {
    const token = await createUser('u1', 'dono1@email.com', 'senhaForte123')
    const petId = await createPet(token, 'Thor')
    await activatePremium(token)

    const res = await request(app.getHttpServer())
      .get(`/pets/${petId}/access-events`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect(res.body).toEqual([])
  })

  it('anti-IDOR: tutor B (Premium) não acessa dados do tutor A', async () => {
    const tokenA = await createUser('u1', 'dono1@email.com', 'senhaForte123')
    const tokenB = await createUser('u2', 'dono2@email.com', 'senhaForte123')
    const petId = await createPet(tokenA, 'Thor')

    await activatePremium(tokenA)
    await activatePremium(tokenB)

    await request(app.getHttpServer())
      .put(`/pets/${petId}/medical`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ allergies: 'pólen' })
      .expect(200)

    // B é Premium mas não é dono do pet → 403 (ownership).
    await request(app.getHttpServer())
      .get(`/pets/${petId}/medical`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(403)
    await request(app.getHttpServer())
      .get(`/pets/${petId}/contacts`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(403)
  })

  it('GET /admin/subscriptions lista assinaturas com owner + plano (envelope)', async () => {
    const token1 = await createUser('u1', 'dono1@email.com', 'senhaForte123')
    await activatePremium(token1)
    const token2 = await createUser('u2', 'dono2@email.com', 'senhaForte123')
    await activatePremium(token2)

    const admin = await createAdmin()
    const res = await request(app.getHttpServer())
      .get('/admin/subscriptions')
      .set('Authorization', `Bearer ${admin}`)
      .expect(200)

    const body = res.body as {
      data: Array<{
        status: string
        owner: { email: string }
        plan: { code: string }
      }>
      meta: { total: number; page: number; limit: number; totalPages: number }
    }
    expect(body.meta.total).toBe(2)
    expect(body.data).toHaveLength(2)
    expect(body.data.map(s => s.owner.email).sort()).toEqual([
      'dono1@email.com',
      'dono2@email.com',
    ])
    for (const s of body.data) {
      expect(s.plan.code).toBe('PREMIUM')
      expect(s.status).toBe('ACTIVE')
    }
  })

  it('GET /admin/subscriptions filtra por status', async () => {
    const token = await createUser('u1', 'dono1@email.com', 'senhaForte123')
    await activatePremium(token)
    await request(app.getHttpServer())
      .post('/subscriptions/cancel')
      .set('Authorization', `Bearer ${token}`)
      .expect(201)

    const admin = await createAdmin()
    const res = await request(app.getHttpServer())
      .get('/admin/subscriptions?status=CANCELLED')
      .set('Authorization', `Bearer ${admin}`)
      .expect(200)
    const body = res.body as { data: Array<{ status: string }> }
    expect(body.data).toHaveLength(1)
    expect(body.data[0].status).toBe('CANCELLED')
  })

  it('POST /admin/subscriptions/:userId/cancel cancela (204)', async () => {
    const token = await createUser('u1', 'dono1@email.com', 'senhaForte123')
    await activatePremium(token)

    const admin = await createAdmin()
    await request(app.getHttpServer())
      .post('/admin/subscriptions/u1/cancel')
      .set('Authorization', `Bearer ${admin}`)
      .expect(204)

    const res = await request(app.getHttpServer())
      .get('/admin/subscriptions?userId=u1')
      .set('Authorization', `Bearer ${admin}`)
      .expect(200)
    const body = res.body as { data: Array<{ status: string }> }
    expect(body.data).toHaveLength(1)
    expect(body.data[0].status).toBe('CANCELLED')
  })

  it('GET /admin/subscriptions sem token retorna 401', async () => {
    await request(app.getHttpServer()).get('/admin/subscriptions').expect(401)
  })

  it('GET /admin/subscriptions com role USER retorna 403', async () => {
    const token = await createUser('u1', 'dono1@email.com', 'senhaForte123')
    await request(app.getHttpServer())
      .get('/admin/subscriptions')
      .set('Authorization', `Bearer ${token}`)
      .expect(403)
  })
})
