import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import * as bcrypt from 'bcrypt'
import request from 'supertest'
import { App } from 'supertest/types'
import { AppModule } from './../src/app.module'
import { PrismaService } from './../src/infrastructure/database/prisma.service'
import { flushRedis } from './helpers/flush-redis'

type AuthBody = { accessToken: string; refreshToken: string }

describe('Pets (e2e)', () => {
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
  })

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

  it('cria, lista, atualiza, marca perdido e deleta um pet', async () => {
    const token = await createUser('u1', 'dono1@email.com', 'senhaForte123')

    // criar
    const createRes = await request(app.getHttpServer())
      .post('/pets')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Thor', species: 'Cão', breed: 'Shih Tzu' })
      .expect(201)
    const petId = (createRes.body as { id: string }).id
    expect(petId).toBeTruthy()
    expect((createRes.body as { lostStatus: boolean }).lostStatus).toBe(false)

    // listar (só meus)
    const listRes = await request(app.getHttpServer())
      .get('/pets')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect(listRes.body).toHaveLength(1)
    expect((listRes.body as Array<{ name: string }>)[0].name).toBe('Thor')

    // detalhar
    const detailRes = await request(app.getHttpServer())
      .get(`/pets/${petId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect((detailRes.body as { name: string }).name).toBe('Thor')

    // atualizar
    const updateRes = await request(app.getHttpServer())
      .patch(`/pets/${petId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ city: 'Araruama', description: 'Muito carinhoso' })
      .expect(200)
    expect((updateRes.body as { city: string }).city).toBe('Araruama')

    // marcar perdido
    const lostRes = await request(app.getHttpServer())
      .post(`/pets/${petId}/lost`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201)
    expect((lostRes.body as { lostStatus: boolean }).lostStatus).toBe(true)

    // marcar encontrado
    const foundRes = await request(app.getHttpServer())
      .post(`/pets/${petId}/found`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201)
    expect((foundRes.body as { lostStatus: boolean }).lostStatus).toBe(false)

    // deletar (soft delete)
    await request(app.getHttpServer())
      .delete(`/pets/${petId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204)

    // pet deletado some da listagem
    const afterList = await request(app.getHttpServer())
      .get('/pets')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect(afterList.body).toHaveLength(0)
  })

  it('protege contra IDOR (pet de outro dono)', async () => {
    const tokenA = await createUser('u1', 'dono1@email.com', 'senhaForte123')
    const tokenB = await createUser('u2', 'dono2@email.com', 'senhaForte123')

    const createRes = await request(app.getHttpServer())
      .post('/pets')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Thor', species: 'Cão' })
      .expect(201)
    const petId = (createRes.body as { id: string }).id

    // dono B não consegue ver/editar/deletar o pet do dono A
    await request(app.getHttpServer())
      .get(`/pets/${petId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(403)

    await request(app.getHttpServer())
      .patch(`/pets/${petId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ name: 'Hackeado' })
      .expect(403)

    await request(app.getHttpServer())
      .delete(`/pets/${petId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(403)
  })

  it('atualiza privacidade do próprio pet', async () => {
    const token = await createUser('u1', 'dono1@email.com', 'senhaForte123')

    const createRes = await request(app.getHttpServer())
      .post('/pets')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Thor', species: 'Cão' })
      .expect(201)
    const petId = (createRes.body as { id: string }).id

    // defaults
    const privacyRes = await request(app.getHttpServer())
      .get(`/pets/${petId}/privacy`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect(privacyRes.body).toMatchObject({ showPhone: true, showCity: true })

    // atualiza
    const updateRes = await request(app.getHttpServer())
      .patch(`/pets/${petId}/privacy`)
      .set('Authorization', `Bearer ${token}`)
      .send({ showEmail: true, showMedical: true })
      .expect(200)
    expect(
      (updateRes.body as { privacy: Record<string, boolean> }).privacy,
    ).toMatchObject({ showEmail: true, showMedical: true, showPhone: true })
  })

  it('GET /pets sem token retorna 401', async () => {
    await request(app.getHttpServer()).get('/pets').expect(401)
  })

  it('admin lista todos os pets', async () => {
    const userToken = await createUser('u1', 'dono1@email.com', 'senhaForte123')

    await request(app.getHttpServer())
      .post('/pets')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: 'Thor', species: 'Cão' })
      .expect(201)

    // cria admin
    const adminRole = await prisma.role.create({ data: { name: 'ADMIN' } })
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

    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@email.com', password: 'adminSenha123' })
      .expect(200)
    const adminToken = (adminLogin.body as AuthBody).accessToken

    const res = await request(app.getHttpServer())
      .get('/admin/pets')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
    expect(res.body).toHaveLength(1)
    const pets = res.body as Array<{
      owner: { id: string; name: string; email: string }
    }>
    expect(pets[0].owner).toEqual({
      id: 'u1',
      name: 'Dono dono1@email.com',
      email: 'dono1@email.com',
    })
  })

  it('admin filtra pets por ownerId', async () => {
    const tokenA = await createUser('u1', 'dono1@email.com', 'senhaForte123')
    const tokenB = await createUser('u2', 'dono2@email.com', 'senhaForte123')

    await request(app.getHttpServer())
      .post('/pets')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Thor', species: 'Cão' })
      .expect(201)

    await request(app.getHttpServer())
      .post('/pets')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ name: 'Rex', species: 'Cão' })
      .expect(201)

    const adminRole = await prisma.role.create({ data: { name: 'ADMIN' } })
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
    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@email.com', password: 'adminSenha123' })
      .expect(200)
    const adminToken = (adminLogin.body as AuthBody).accessToken

    const res = await request(app.getHttpServer())
      .get('/admin/pets')
      .query({ ownerId: 'u1' })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
    expect(res.body).toHaveLength(1)
    expect((res.body as Array<{ name: string }>)[0].name).toBe('Thor')
    expect((res.body as Array<{ owner: { id: string } }>)[0].owner.id).toBe(
      'u1',
    )
  })

  it('usuário comum não acessa /admin/pets', async () => {
    const token = await createUser('u1', 'dono1@email.com', 'senhaForte123')

    await request(app.getHttpServer())
      .get('/admin/pets')
      .set('Authorization', `Bearer ${token}`)
      .expect(403)
  })
})
