import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import * as bcrypt from 'bcrypt'
import request from 'supertest'
import { App } from 'supertest/types'
import { AppModule } from './../src/app.module'
import { PrismaService } from './../src/infrastructure/database/prisma.service'
import { RedisService } from './../src/infrastructure/cache/redis.service'
import { cleanDatabase } from './helpers/clean-database'

type AuthBody = { accessToken: string; refreshToken: string }

describe('Verificação de email e recuperação de senha (e2e)', () => {
  let app: INestApplication<App>
  let prisma: PrismaService
  let redis: RedisService

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()

    prisma = app.get(PrismaService)
    redis = app.get(RedisService)
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(async () => {
    await cleanDatabase(prisma)
  })

  it('forgot-password → reset-password → login com a nova senha', async () => {
    // cria usuário
    await prisma.user.create({
      data: {
        id: 'reset-user',
        name: 'Reset User',
        email: 'reset@email.com',
        password_hash: await bcrypt.hash('senhaAntiga123', 12),
        status: 'ACTIVE',
      },
    })

    // solicita reset
    await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email: 'reset@email.com' })
      .expect(204)

    // o token é gerado no Redis (chave reset:<token>); lemos do log de teste
    // simulando o fluxo real: injetamos um token diretamente no Redis.
    const token = 'token-e2e-reset'
    await redis.set(`reset:${token}`, 'reset-user', 3600)

    // reseta a senha
    await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ token, newPassword: 'senhaNova123' })
      .expect(204)

    // login com a senha nova
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'reset@email.com', password: 'senhaNova123' })
      .expect(200)
  })

  it('verify-email ativa o usuário', async () => {
    await prisma.user.create({
      data: {
        id: 'verify-user',
        name: 'Verify User',
        email: 'verify@email.com',
        password_hash: await bcrypt.hash('senhaForte123', 12),
        status: 'PENDING_VERIFICATION',
      },
    })

    const token = 'token-e2e-verify'
    await redis.set(`verify:${token}`, 'verify-user', 86400)

    await request(app.getHttpServer())
      .post('/auth/verify-email')
      .send({ token })
      .expect(204)

    const user = await prisma.user.findUnique({
      where: { id: 'verify-user' },
    })
    expect(user?.status).toBe('ACTIVE')
    expect(user?.email_verified_at).not.toBeNull()
  })

  it('reset-password rejeita token inválido', async () => {
    await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ token: 'token-invalido', newPassword: 'senhaNova123' })
      .expect(401)
  })
})
