import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import * as bcrypt from 'bcrypt'
import request from 'supertest'
import { App } from 'supertest/types'
import { AppModule } from './../src/app.module'
import { PrismaService } from './../src/infrastructure/database/prisma.service'
import { flushRedis } from './helpers/flush-redis'

type AuthBody = { accessToken: string; refreshToken: string }

describe('Admin RBAC (e2e)', () => {
  let app: INestApplication<App>
  let prisma: PrismaService
  let premiumPlanId: string

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

    // roles
    const adminRole = await prisma.role.create({ data: { name: 'ADMIN' } })
    await prisma.role.create({ data: { name: 'USER' } })

    // planos (para o endpoint admin de plano)
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
    premiumPlanId = premium.id

    // permissions
    const readUser = await prisma.permission.create({
      data: { code: 'user:read', resource: 'users', action: 'read' },
    })
    const userStatus = await prisma.permission.create({
      data: { code: 'user:status', resource: 'users', action: 'status' },
    })
    const userRolePerm = await prisma.permission.create({
      data: { code: 'user:role', resource: 'users', action: 'role' },
    })

    // ADMIN → user:read, user:status (não user:role)
    await prisma.rolePermission.create({
      data: { role_id: adminRole.id, permission_id: readUser.id },
    })
    await prisma.rolePermission.create({
      data: { role_id: adminRole.id, permission_id: userStatus.id },
    })

    // admin user
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

    // regular user
    await prisma.user.create({
      data: {
        id: 'regular-1',
        name: 'Regular',
        email: 'regular@email.com',
        password_hash: await bcrypt.hash('regularSenha123', 12),
        status: 'ACTIVE',
      },
    })
  })

  async function login(email: string, password: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200)
    return (res.body as AuthBody).accessToken
  }

  it('ADMIN lista usuários (user:read via role ADMIN)', async () => {
    const token = await login('admin@email.com', 'adminSenha123')

    const res = await request(app.getHttpServer())
      .get('/admin/users')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    const body = res.body as {
      data: Array<Record<string, unknown>>
      meta: { total: number; page: number; limit: number; totalPages: number }
    }
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.data.length).toBeGreaterThanOrEqual(2)
    // metadados de paginação
    expect(body.meta.total).toBeGreaterThanOrEqual(2)
    expect(body.meta.page).toBe(1)
    expect(body.meta.limit).toBe(20)
    expect(body.meta.totalPages).toBeGreaterThanOrEqual(1)
    // não vaza password_hash
    expect(body.data[0]).not.toHaveProperty('password_hash')
    // roles são expostas por usuário (admin tem ADMIN; regular não tem role)
    const adminInList = body.data.find(u => u.email === 'admin@email.com')
    expect(adminInList?.roles).toEqual(['ADMIN'])
    expect(adminInList?.permissions).toEqual(['user:read', 'user:status'])
    const regularInList = body.data.find(u => u.email === 'regular@email.com')
    expect(regularInList?.roles).toEqual([])
    expect(regularInList?.permissions).toEqual([])
  })

  it('filtra usuários por role (nomeada + NONE)', async () => {
    const token = await login('admin@email.com', 'adminSenha123')

    // role=ADMIN → só o admin
    const staffRes = await request(app.getHttpServer())
      .get('/admin/users?role=ADMIN')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    const staffBody = staffRes.body as {
      data: Array<{ email: string }>
      meta: { total: number }
    }
    expect(staffBody.data.map(u => u.email)).toEqual(['admin@email.com'])
    expect(staffBody.meta.total).toBe(1)

    // role=NONE → só o regular (sem role)
    const noneRes = await request(app.getHttpServer())
      .get('/admin/users?role=NONE')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    const noneBody = noneRes.body as {
      data: Array<{ email: string }>
      meta: { total: number }
    }
    expect(noneBody.data.map(u => u.email)).toEqual(['regular@email.com'])
    expect(noneBody.meta.total).toBe(1)

    // role=ADMIN,NONE → ambos (semântica OR)
    const bothRes = await request(app.getHttpServer())
      .get('/admin/users?role=ADMIN,NONE')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    const bothBody = bothRes.body as {
      data: Array<{ email: string }>
      meta: { total: number }
    }
    expect(bothBody.meta.total).toBe(2)

    // role inválida → 400 (Zod)
    await request(app.getHttpServer())
      .get('/admin/users?role=DEUS')
      .set('Authorization', `Bearer ${token}`)
      .expect(400)
  })

  it('ADMIN altera status de usuário (permissão user:status)', async () => {
    const token = await login('admin@email.com', 'adminSenha123')

    const res = await request(app.getHttpServer())
      .patch('/admin/users/regular-1/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'BLOCKED' })
      .expect(200)

    const body = res.body as { status: string }
    expect(body.status).toBe('BLOCKED')
  })

  it('ADMIN NÃO pode alterar role (user:role é só SUPER_ADMIN)', async () => {
    const token = await login('admin@email.com', 'adminSenha123')

    await request(app.getHttpServer())
      .patch('/admin/users/regular-1/role')
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'OPERATOR' })
      .expect(403)
  })

  it('usuário comum não acessa admin', async () => {
    // cria role USER com permissão nenhuma para o regular
    const userRole = await prisma.role.findUnique({
      where: { name: 'USER' },
    })
    const regular = await prisma.user.findUnique({
      where: { email: 'regular@email.com' },
    })
    await prisma.userRole.create({
      data: { user_id: regular!.id, role_id: userRole!.id },
    })

    const token = await login('regular@email.com', 'regularSenha123')

    await request(app.getHttpServer())
      .get('/admin/users')
      .set('Authorization', `Bearer ${token}`)
      .expect(403)
  })

  it('rejeita role inválida (não está no enum)', async () => {
    // cria um SUPER_ADMIN para poder chamar o endpoint
    const superRole = await prisma.role.create({
      data: { name: 'SUPER_ADMIN' },
    })
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

    const token = await login('super@email.com', 'superSenha123')

    await request(app.getHttpServer())
      .patch('/admin/users/regular-1/role')
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'DEUS' })
      .expect(400)
  })

  it('SUPER_ADMIN promove USER → ADMIN via setRole (substitui)', async () => {
    const superRole = await prisma.role.create({
      data: { name: 'SUPER_ADMIN' },
    })
    const superUser = await prisma.user.create({
      data: {
        id: 'super-role-1',
        name: 'Super Role',
        email: 'superrole@email.com',
        password_hash: await bcrypt.hash('superRole123', 12),
        status: 'ACTIVE',
      },
    })
    await prisma.userRole.create({
      data: { user_id: superUser.id, role_id: superRole.id },
    })

    const token = await login('superrole@email.com', 'superRole123')

    await request(app.getHttpServer())
      .patch('/admin/users/regular-1/role')
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'ADMIN' })
      .expect(200)

    // deve ter exatamente UMA role (ADMIN), não acumular USER + ADMIN
    const userRoles = await prisma.userRole.findMany({
      where: { user_id: 'regular-1' },
      include: { role: true },
    })
    expect(userRoles.map(ur => ur.role.name)).toEqual(['ADMIN'])
  })

  it('setRole NÃO permite SUPER_ADMIN (user nunca vira super admin)', async () => {
    const superRole = await prisma.role.create({
      data: { name: 'SUPER_ADMIN' },
    })
    const superUser = await prisma.user.create({
      data: {
        id: 'super-role-2',
        name: 'Super Role 2',
        email: 'superrole2@email.com',
        password_hash: await bcrypt.hash('superRole123', 12),
        status: 'ACTIVE',
      },
    })
    await prisma.userRole.create({
      data: { user_id: superUser.id, role_id: superRole.id },
    })

    const token = await login('superrole2@email.com', 'superRole123')

    await request(app.getHttpServer())
      .patch('/admin/users/regular-1/role')
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'SUPER_ADMIN' })
      .expect(400)
  })

  it('SUPER_ADMIN cria um novo ADMIN (POST /admin/users)', async () => {
    const superRole = await prisma.role.create({
      data: { name: 'SUPER_ADMIN' },
    })
    const superUser = await prisma.user.create({
      data: {
        id: 'super-create-1',
        name: 'Super Create',
        email: 'supercreate@email.com',
        password_hash: await bcrypt.hash('superCreate123', 12),
        status: 'ACTIVE',
      },
    })
    await prisma.userRole.create({
      data: { user_id: superUser.id, role_id: superRole.id },
    })

    const token = await login('supercreate@email.com', 'superCreate123')

    const res = await request(app.getHttpServer())
      .post('/admin/users')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Novo Admin',
        email: 'novoadmin@email.com',
        password: 'novoAdmin123',
        role: 'ADMIN',
      })
      .expect(201)

    expect(res.body).toHaveProperty('id')
    const created = await prisma.user.findUnique({
      where: { email: 'novoadmin@email.com' },
      include: { roles: { include: { role: true } } },
    })
    expect(created?.status).toBe('ACTIVE')
    expect(created?.roles.map(r => r.role.name)).toEqual(['ADMIN'])
  })

  it('ADMIN NÃO pode criar admin (POST /admin/users)', async () => {
    const token = await login('admin@email.com', 'adminSenha123')

    await request(app.getHttpServer())
      .post('/admin/users')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'X',
        email: 'x@email.com',
        password: 'senhaForte123',
        role: 'ADMIN',
      })
      .expect(403)
  })

  it('ADMIN atualiza dados de um USER cliente (PATCH /admin/users/:id)', async () => {
    const token = await login('admin@email.com', 'adminSenha123')

    const res = await request(app.getHttpServer())
      .patch('/admin/users/regular-1')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Regular Editado' })
      .expect(200)

    expect((res.body as { name: string }).name).toBe('Regular Editado')
  })

  it('ADMIN NÃO atualiza outro ADMIN (hierarquia)', async () => {
    const adminRole = await prisma.role.findUniqueOrThrow({
      where: { name: 'ADMIN' },
    })
    const admin2 = await prisma.user.create({
      data: {
        id: 'admin-edit-1',
        name: 'Admin Edit',
        email: 'adminedit@email.com',
        password_hash: await bcrypt.hash('adminEdit123', 12),
        status: 'ACTIVE',
      },
    })
    await prisma.userRole.create({
      data: { user_id: admin2.id, role_id: adminRole.id },
    })

    const token = await login('admin@email.com', 'adminSenha123')

    await request(app.getHttpServer())
      .patch('/admin/users/admin-edit-1')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Hackeado' })
      .expect(403)
  })

  it('ADMIN deleta (soft delete) um USER cliente', async () => {
    const token = await login('admin@email.com', 'adminSenha123')

    await request(app.getHttpServer())
      .delete('/admin/users/regular-1')
      .set('Authorization', `Bearer ${token}`)
      .expect(204)

    const regular = await prisma.user.findUnique({
      where: { id: 'regular-1' },
    })
    expect(regular?.deleted_at).not.toBeNull()
  })

  it('ADMIN reativa (restore) um usuário desativado', async () => {
    const token = await login('admin@email.com', 'adminSenha123')

    await request(app.getHttpServer())
      .delete('/admin/users/regular-1')
      .set('Authorization', `Bearer ${token}`)
      .expect(204)

    const res = await request(app.getHttpServer())
      .post('/admin/users/regular-1/restore')
      .set('Authorization', `Bearer ${token}`)
      .expect(201)

    const body = res.body as { status: string }
    expect(body.status).toBe('ACTIVE')

    const regular = await prisma.user.findUnique({
      where: { id: 'regular-1' },
    })
    expect(regular?.deleted_at).toBeNull()
    expect(regular?.status).toBe('ACTIVE')
  })

  it('ADMIN NÃO pode bloquear outro ADMIN (hierarquia)', async () => {
    // cria um segundo ADMIN
    const adminRole = await prisma.role.findUniqueOrThrow({
      where: { name: 'ADMIN' },
    })
    const admin2 = await prisma.user.create({
      data: {
        id: 'admin-2',
        name: 'Admin 2',
        email: 'admin2@email.com',
        password_hash: await bcrypt.hash('admin2Senha123', 12),
        status: 'ACTIVE',
      },
    })
    await prisma.userRole.create({
      data: { user_id: admin2.id, role_id: adminRole.id },
    })

    const token = await login('admin@email.com', 'adminSenha123')

    await request(app.getHttpServer())
      .patch('/admin/users/admin-2/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'BLOCKED' })
      .expect(403)
  })

  it('ADMIN NÃO pode bloquear SUPER_ADMIN (hierarquia)', async () => {
    const superRole = await prisma.role.create({
      data: { name: 'SUPER_ADMIN' },
    })
    const superUser = await prisma.user.create({
      data: {
        id: 'super-2',
        name: 'Super 2',
        email: 'super2@email.com',
        password_hash: await bcrypt.hash('super2Senha123', 12),
        status: 'ACTIVE',
      },
    })
    await prisma.userRole.create({
      data: { user_id: superUser.id, role_id: superRole.id },
    })

    const token = await login('admin@email.com', 'adminSenha123')

    await request(app.getHttpServer())
      .patch('/admin/users/super-2/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'BLOCKED' })
      .expect(403)
  })

  it('SUPER_ADMIN pode bloquear ADMIN (hierarquia permite)', async () => {
    const superRole = await prisma.role.create({
      data: { name: 'SUPER_ADMIN' },
    })
    const superUser = await prisma.user.create({
      data: {
        id: 'super-3',
        name: 'Super 3',
        email: 'super3@email.com',
        password_hash: await bcrypt.hash('super3Senha123', 12),
        status: 'ACTIVE',
      },
    })
    await prisma.userRole.create({
      data: { user_id: superUser.id, role_id: superRole.id },
    })

    const token = await login('super3@email.com', 'super3Senha123')

    const res = await request(app.getHttpServer())
      .patch('/admin/users/regular-1/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'BLOCKED' })
      .expect(200)

    const body = res.body as { status: string }
    expect(body.status).toBe('BLOCKED')
  })

  it('ADMIN reseta senha de um cliente (force reset, 204)', async () => {
    const token = await login('admin@email.com', 'adminSenha123')

    const before = await prisma.user.findUnique({ where: { id: 'regular-1' } })

    await request(app.getHttpServer())
      .post('/admin/users/regular-1/password')
      .set('Authorization', `Bearer ${token}`)
      .expect(204)

    const after = await prisma.user.findUnique({ where: { id: 'regular-1' } })
    expect(after?.password_hash).not.toBe(before?.password_hash)

    // senha antiga não funciona mais
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'regular@email.com', password: 'regularSenha123' })
      .expect(401)
  })

  it('ADMIN NÃO reseta senha de outro ADMIN (hierarquia 403)', async () => {
    const adminRole = await prisma.role.findUniqueOrThrow({
      where: { name: 'ADMIN' },
    })
    const admin2 = await prisma.user.create({
      data: {
        id: 'admin-reset-1',
        name: 'Admin Reset',
        email: 'adminreset@email.com',
        password_hash: await bcrypt.hash('adminReset123', 12),
        status: 'ACTIVE',
      },
    })
    await prisma.userRole.create({
      data: { user_id: admin2.id, role_id: adminRole.id },
    })

    const token = await login('admin@email.com', 'adminSenha123')

    await request(app.getHttpServer())
      .post('/admin/users/admin-reset-1/password')
      .set('Authorization', `Bearer ${token}`)
      .expect(403)
  })

  it('SUPER_ADMIN reseta senha de um ADMIN (204)', async () => {
    const superRole = await prisma.role.create({
      data: { name: 'SUPER_ADMIN' },
    })
    const superUser = await prisma.user.create({
      data: {
        id: 'super-reset-1',
        name: 'Super Reset',
        email: 'superreset@email.com',
        password_hash: await bcrypt.hash('superReset123', 12),
        status: 'ACTIVE',
      },
    })
    await prisma.userRole.create({
      data: { user_id: superUser.id, role_id: superRole.id },
    })

    const token = await login('superreset@email.com', 'superReset123')

    const before = await prisma.user.findUnique({ where: { id: 'admin-1' } })

    await request(app.getHttpServer())
      .post('/admin/users/admin-1/password')
      .set('Authorization', `Bearer ${token}`)
      .expect(204)

    const after = await prisma.user.findUnique({ where: { id: 'admin-1' } })
    expect(after?.password_hash).not.toBe(before?.password_hash)
  })

  it('ADMIN consulta plano de um usuário (Free vs Premium)', async () => {
    const token = await login('admin@email.com', 'adminSenha123')

    // sem assinatura → free
    const freeRes = await request(app.getHttpServer())
      .get('/admin/subscriptions/regular-1')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect(freeRes.body).toEqual({ plan: null, subscription: null })

    // concede assinatura Premium ao cliente
    const now = new Date()
    await prisma.subscription.create({
      data: {
        id: 'sub-regular-1',
        user_id: 'regular-1',
        plan_id: premiumPlanId,
        provider: 'MERCADO_PAGO',
        status: 'ACTIVE',
        started_at: now,
        current_period_start: now,
        current_period_end: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      },
    })

    const premiumRes = await request(app.getHttpServer())
      .get('/admin/subscriptions/regular-1')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    const planBody = premiumRes.body as {
      plan: { code: string }
      subscription: { status: string }
    }
    expect(planBody.plan.code).toBe('PREMIUM')
    expect(planBody.subscription.status).toBe('ACTIVE')
  })
})
