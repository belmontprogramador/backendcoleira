import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import * as bcrypt from 'bcrypt'
import request from 'supertest'
import { App } from 'supertest/types'
import { AppModule } from './../src/app.module'
import { PrismaService } from './../src/infrastructure/database/prisma.service'
import { flushRedis } from './helpers/flush-redis'
import { cleanDatabase } from './helpers/clean-database'

type AuthBody = {
  accessToken: string
  refreshToken: string
}

describe('Auth (e2e)', () => {
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
    await prisma.user.create({
      data: {
        id: 'e2e-user',
        name: 'E2E User',
        email: 'e2e@email.com',
        password_hash: await bcrypt.hash('senhaSegura123', 12),
        status: 'ACTIVE',
        email_verified_at: new Date(),
      },
    })
  })

  it('login → refresh → logout', async () => {
    // login
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'e2e@email.com', password: 'senhaSegura123' })
      .expect(200)

    const tokens = loginRes.body as AuthBody
    expect(tokens.accessToken).toBeTruthy()
    expect(tokens.refreshToken).toBeTruthy()

    // refresh (rotação)
    const refreshRes = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: tokens.refreshToken })
      .expect(200)

    const rotated = refreshRes.body as AuthBody
    expect(rotated.accessToken).toBeTruthy()
    expect(rotated.refreshToken).toBeTruthy()
    expect(rotated.refreshToken).not.toBe(tokens.refreshToken)

    // reuso do refresh antigo → rejeitado (single-use)
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: tokens.refreshToken })
      .expect(401)

    // logout com o refresh rotacionado
    await request(app.getHttpServer())
      .post('/auth/logout')
      .send({ refreshToken: rotated.refreshToken })
      .expect(204)
  })

  it('login rejeita credenciais inválidas', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'e2e@email.com', password: 'senhaErrada' })
      .expect(401)
  })

  it('login valida payload com Zod', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'nao-e-email', password: '' })
      .expect(400)
  })
})
