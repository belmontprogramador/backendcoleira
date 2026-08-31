import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
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

type MeBody = {
  id: string
  name: string
  email: string
  phone: string | null
  status: string
  roles: string[]
  permissions: string[]
}

describe('Users profile (e2e)', () => {
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
    // O registro público atribui a role USER — ela precisa existir.
    await prisma.role.create({ data: { name: 'USER' } })
  })

  it('register → login → me → update → change password → deactivate', async () => {
    // register
    const registerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'João Silva',
        email: 'joao@email.com',
        password: 'senhaForte123',
        phone: '+5521999999999',
      })
      .expect(201)

    const userId = (registerRes.body as { id: string }).id
    expect(userId).toBeTruthy()

    // login
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'joao@email.com', password: 'senhaForte123' })
      .expect(200)
    const { accessToken } = loginRes.body as AuthBody

    // me (protegido)
    const meRes = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
    const me = meRes.body as MeBody
    expect(me.email).toBe('joao@email.com')
    expect(me.name).toBe('João Silva')
    // usuário recém-registrado nasce com a role USER (cliente final)
    expect(me.roles).toEqual(['USER'])
    expect(me.permissions).toEqual([])
    // não vaza password_hash
    expect(meRes.body).not.toHaveProperty('password_hash')

    // update profile
    await request(app.getHttpServer())
      .patch('/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'João S.', phone: '+5521988887777' })
      .expect(200)

    // change password
    await request(app.getHttpServer())
      .patch('/users/me/password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ currentPassword: 'senhaForte123', newPassword: 'novaSenha456' })
      .expect(204)

    // login com a senha nova funciona
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'joao@email.com', password: 'novaSenha456' })
      .expect(200)

    // deactivate
    await request(app.getHttpServer())
      .delete('/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204)

    // usuário desativado não consegue mais logar
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'joao@email.com', password: 'novaSenha456' })
      .expect(401)
  })

  it('GET /users/me sem token retorna 401', async () => {
    await request(app.getHttpServer()).get('/users/me').expect(401)
  })

  it('register rejeita email duplicado', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'Ana', email: 'dup@email.com', password: 'senhaForte123' })
      .expect(201)

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'Bob', email: 'dup@email.com', password: 'senhaForte123' })
      .expect(409)
  })
})
