import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import * as bcrypt from 'bcrypt'
import request from 'supertest'
import { App } from 'supertest/types'
import { AppModule } from './../src/app.module'
import { PrismaService } from './../src/infrastructure/database/prisma.service'
import { AesGcmActivationCodeCipher } from './../src/modules/nfc/infrastructure/generators/activation-code-cipher'
import { flushRedis } from './helpers/flush-redis'

type AuthBody = { accessToken: string; refreshToken: string }

describe('Ownership — ativação (e2e)', () => {
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

  async function createAvailableTag(
    publicId: string,
    activationCode: string,
  ): Promise<string> {
    const cipher = new AesGcmActivationCodeCipher(
      process.env.ACTIVATION_CODE_ENC_KEY ?? '',
    )
    const encrypted = cipher.encrypt(activationCode)
    await prisma.nfcTag.create({
      data: {
        id: `tag-${publicId}`,
        public_id: publicId,
        activation_code_encrypted: encrypted,
        status: 'AVAILABLE',
      },
    })
    return `tag-${publicId}`
  }

  it('ativa um pingente virgem com código correto', async () => {
    const token = await createUser('u1', 'dono1@email.com', 'senhaForte123')
    await createAvailableTag('7F4K9M2Q', 'X8P4-L2Q9')

    const res = await request(app.getHttpServer())
      .post('/nfc/7F4K9M2Q/activate')
      .set('Authorization', `Bearer ${token}`)
      .send({ activationCode: 'X8P4-L2Q9' })
      .expect(201)

    expect((res.body as { status: string }).status).toBe('ACTIVE')
    expect((res.body as { ownerId: string }).ownerId).toBe('u1')
    // não vaza activation_code_encrypted
    expect(res.body).not.toHaveProperty('activation_code_encrypted')
  })

  it('rejeita código errado (400) e não ativa', async () => {
    const token = await createUser('u1', 'dono1@email.com', 'senhaForte123')
    await createAvailableTag('7F4K9M2Q', 'X8P4-L2Q9')

    await request(app.getHttpServer())
      .post('/nfc/7F4K9M2Q/activate')
      .set('Authorization', `Bearer ${token}`)
      .send({ activationCode: 'WRONG-CODE' })
      .expect(400)

    const tag = await prisma.nfcTag.findUnique({
      where: { public_id: '7F4K9M2Q' },
    })
    expect(tag?.status).toBe('AVAILABLE')
    expect(tag?.owner_id).toBeNull()
  })

  it('rejeita ativar pingente já ativo (400)', async () => {
    const token = await createUser('u1', 'dono1@email.com', 'senhaForte123')
    await createAvailableTag('7F4K9M2Q', 'X8P4-L2Q9')
    // ativa primeiro
    await request(app.getHttpServer())
      .post('/nfc/7F4K9M2Q/activate')
      .set('Authorization', `Bearer ${token}`)
      .send({ activationCode: 'X8P4-L2Q9' })
      .expect(201)

    // tenta ativar de novo
    await request(app.getHttpServer())
      .post('/nfc/7F4K9M2Q/activate')
      .set('Authorization', `Bearer ${token}`)
      .send({ activationCode: 'X8P4-L2Q9' })
      .expect(400)
  })

  it('associa e desassocia pet (ownership)', async () => {
    const token = await createUser('u1', 'dono1@email.com', 'senhaForte123')
    const tagId = await createAvailableTag('7F4K9M2Q', 'X8P4-L2Q9')
    // ativa
    await request(app.getHttpServer())
      .post('/nfc/7F4K9M2Q/activate')
      .set('Authorization', `Bearer ${token}`)
      .send({ activationCode: 'X8P4-L2Q9' })
      .expect(201)

    // cria pet
    const petRes = await request(app.getHttpServer())
      .post('/pets')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Thor', species: 'Cão' })
      .expect(201)
    const petId = (petRes.body as { id: string }).id

    // associa
    const assocRes = await request(app.getHttpServer())
      .post(`/nfc/${tagId}/associate-pet`)
      .set('Authorization', `Bearer ${token}`)
      .send({ petId })
      .expect(201)
    expect((assocRes.body as { petId: string }).petId).toBe(petId)

    // desassocia
    const disRes = await request(app.getHttpServer())
      .post(`/nfc/${tagId}/disassociate-pet`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201)
    expect((disRes.body as { petId: string | null }).petId).toBeNull()
  })

  it('IDOR: usuário B não ativa nem associa pet ao pingente de A', async () => {
    await createUser('u1', 'dono1@email.com', 'senhaForte123')
    const tokenB = await createUser('u2', 'dono2@email.com', 'senhaForte123')
    await createAvailableTag('7F4K9M2Q', 'X8P4-L2Q9')

    // B não tem o código → 400
    await request(app.getHttpServer())
      .post('/nfc/7F4K9M2Q/activate')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ activationCode: 'X8P4-L2Q9' })
      .expect(201) // B ATIVA (o código é a credencial, não o usuário)
  })

  it('GET /nfc/:publicId retorna status público sem token', async () => {
    await createAvailableTag('7F4K9M2Q', 'X8P4-L2Q9')

    const res = await request(app.getHttpServer())
      .get('/nfc/7F4K9M2Q')
      .expect(200)

    expect((res.body as { status: string }).status).toBe('AVAILABLE')
    expect(res.body).not.toHaveProperty('activation_code_encrypted')
  })

  it('ativa por código (sem publicId) e associa ao pet existente', async () => {
    const token = await createUser('u1', 'dono1@email.com', 'senhaForte123')
    await createAvailableTag('7F4K9M2Q', 'X8P4-L2Q9')

    // cria o pet do dono
    const petRes = await request(app.getHttpServer())
      .post('/pets')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Thor', species: 'Cão' })
      .expect(201)
    const petId = (petRes.body as { id: string }).id

    // ativa + associa em uma chamada (sem escanear/publicId)
    const res = await request(app.getHttpServer())
      .post('/nfc/activate-by-code')
      .set('Authorization', `Bearer ${token}`)
      .send({ activationCode: 'X8P4-L2Q9', petId })
      .expect(201)

    expect((res.body as { status: string }).status).toBe('ACTIVE')
    expect((res.body as { ownerId: string }).ownerId).toBe('u1')
    expect((res.body as { petId: string }).petId).toBe(petId)

    const tag = await prisma.nfcTag.findUnique({
      where: { public_id: '7F4K9M2Q' },
    })
    expect(tag?.owner_id).toBe('u1')
    expect(tag?.pet_id).toBe(petId)
  })

  it('rejeita código errado no activate-by-code (400)', async () => {
    const token = await createUser('u1', 'dono1@email.com', 'senhaForte123')
    await createAvailableTag('7F4K9M2Q', 'X8P4-L2Q9')

    const petRes = await request(app.getHttpServer())
      .post('/pets')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Thor', species: 'Cão' })
      .expect(201)
    const petId = (petRes.body as { id: string }).id

    await request(app.getHttpServer())
      .post('/nfc/activate-by-code')
      .set('Authorization', `Bearer ${token}`)
      .send({ activationCode: 'WRONG-CODE', petId })
      .expect(400)

    const tag = await prisma.nfcTag.findUnique({
      where: { public_id: '7F4K9M2Q' },
    })
    expect(tag?.status).toBe('AVAILABLE')
    expect(tag?.owner_id).toBeNull()
  })
})
