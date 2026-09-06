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

describe('Products (e2e)', () => {
  let app: INestApplication<App>
  let prisma: PrismaService
  let productId: string

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
    await prisma.product.deleteMany()

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

    const product = await prisma.product.create({
      data: {
        id: 'prod-1',
        sku: 'pingente',
        name: 'Pingente Elopet',
        price_cents: 1990,
      },
    })
    productId = product.id
  })

  async function login(email: string, password: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200)
    return (res.body as AuthBody).accessToken
  }

  it('GET /products/pingente retorna o produto (público)', async () => {
    const res = await request(app.getHttpServer())
      .get('/products/pingente')
      .expect(200)

    expect(res.body).toMatchObject({
      sku: 'pingente',
      name: 'Pingente Elopet',
      priceCents: 1990,
      active: true,
    })
  })

  it('ADMIN altera o preço do produto', async () => {
    const token = await login('admin@email.com', 'adminSenha123')

    const res = await request(app.getHttpServer())
      .patch(`/admin/products/${productId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ priceCents: 2990, name: 'Pingente Premium' })
      .expect(200)

    expect((res.body as { priceCents: number }).priceCents).toBe(2990)

    const stored = await prisma.product.findUnique({ where: { id: productId } })
    expect(stored?.price_cents).toBe(2990)
  })

  it('USER não pode alterar produto (403)', async () => {
    const token = await login('client@email.com', 'clientSenha123')

    await request(app.getHttpServer())
      .patch(`/admin/products/${productId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ priceCents: 1 })
      .expect(403)
  })

  it('rejeita corpo vazio (400)', async () => {
    const token = await login('admin@email.com', 'adminSenha123')

    await request(app.getHttpServer())
      .patch(`/admin/products/${productId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(400)
  })

  it('produto inativo retorna 404 no GET público', async () => {
    await prisma.product.update({
      where: { id: productId },
      data: { active: false },
    })

    await request(app.getHttpServer())
      .get('/products/pingente')
      .expect(404)
  })
})
