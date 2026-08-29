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
type ContactMessageResponse = {
  id: string
  petId: string
  senderName: string | null
  senderPhone: string | null
  senderEmail: string | null
  message: string
  source: string
  isRead: boolean
  readAt: string | null
  createdAt: string
}

describe('Contato (e2e)', () => {
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
  })

  async function createUser(
    id: string,
    email: string,
    password: string,
    phone?: string,
  ): Promise<string> {
    await prisma.user.create({
      data: {
        id,
        name: `Dono ${email}`,
        email,
        password_hash: await bcrypt.hash(password, 12),
        phone: phone ?? null,
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

  async function activateAndAssociate(
    token: string,
    publicId: string,
    activationCode: string,
    pet: { name: string; species: string },
  ): Promise<{ tagId: string; petId: string }> {
    const tagId = await createAvailableTag(publicId, activationCode)
    await request(app.getHttpServer())
      .post(`/nfc/${publicId}/activate`)
      .set('Authorization', `Bearer ${token}`)
      .send({ activationCode })
      .expect(201)

    const petRes = await request(app.getHttpServer())
      .post('/pets')
      .set('Authorization', `Bearer ${token}`)
      .send(pet)
      .expect(201)
    const petId = (petRes.body as { id: string }).id

    await request(app.getHttpServer())
      .post(`/nfc/${tagId}/associate-pet`)
      .set('Authorization', `Bearer ${token}`)
      .send({ petId })
      .expect(201)

    return { tagId, petId }
  }

  function sendContact(publicId: string, body: Record<string, unknown>) {
    return request(app.getHttpServer())
      .post(`/p/${publicId}/contact`)
      .send(body)
  }

  it('fluxo completo: visitante envia → tutor lista → detalha → marca lida', async () => {
    const token = await createUser(
      'u1',
      'dono1@email.com',
      'senhaForte123',
      '+5521999999999',
    )
    await activateAndAssociate(token, '7F4K9M2Q', 'X8P4-L2Q9', {
      name: 'Thor',
      species: 'Cão',
    })

    // Visitante (público) envia a mensagem.
    const send = await sendContact('7F4K9M2Q', {
      message: 'Achei seu cachorro na praça!',
      sender_name: 'Ana',
      sender_phone: '(21) 98888-7777',
      sender_email: 'ana@example.com',
      source: 'qr',
    }).expect(201)
    const messageId = (send.body as { messageId: string }).messageId
    expect(messageId).toBeTruthy()

    // Tutor lista o inbox (sem filtro).
    const inbox = await request(app.getHttpServer())
      .get('/contacts')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    const list = inbox.body as ContactMessageResponse[]
    expect(list).toHaveLength(1)
    expect(list[0].id).toBe(messageId)
    expect(list[0].petId).toBeTruthy()
    expect(list[0].senderName).toBe('Ana')
    expect(list[0].senderPhone).toBe('(21) 98888-7777')
    expect(list[0].senderEmail).toBe('ana@example.com')
    expect(list[0].message).toBe('Achei seu cachorro na praça!')
    expect(list[0].source).toBe('QR')
    expect(list[0].isRead).toBe(false)
    expect(list[0].readAt).toBeNull()

    // Tutor detalha a mensagem.
    const detail = await request(app.getHttpServer())
      .get(`/contacts/${messageId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect((detail.body as ContactMessageResponse).id).toBe(messageId)

    // Tutor marca como lida.
    const read = await request(app.getHttpServer())
      .patch(`/contacts/${messageId}/read`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect((read.body as ContactMessageResponse).isRead).toBe(true)
    expect((read.body as ContactMessageResponse).readAt).not.toBeNull()

    // Inbox reflete a leitura.
    const after = await request(app.getHttpServer())
      .get('/contacts')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect((after.body as ContactMessageResponse[])[0].isRead).toBe(true)
  })

  it('não expõe dados internos do visitante (ipHash/userAgent/nfcTagId)', async () => {
    const token = await createUser('u1', 'dono1@email.com', 'senhaForte123')
    await activateAndAssociate(token, '7F4K9M2Q', 'X8P4-L2Q9', {
      name: 'Thor',
      species: 'Cão',
    })

    await sendContact('7F4K9M2Q', { message: 'Oi' }).expect(201)

    const inbox = await request(app.getHttpServer())
      .get('/contacts')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    const msg = (inbox.body as ContactMessageResponse[])[0]

    expect(msg).not.toHaveProperty('ipHash')
    expect(msg).not.toHaveProperty('userAgent')
    expect(msg).not.toHaveProperty('nfcTagId')
  })

  it('anti-IDOR: tutor B não acessa mensagem do tutor A', async () => {
    const tokenA = await createUser('u1', 'dono1@email.com', 'senhaForte123')
    const tokenB = await createUser('u2', 'dono2@email.com', 'senhaForte123')
    await activateAndAssociate(tokenA, '3J8L5N2P', 'X8P4-L2Q9', {
      name: 'Thor',
      species: 'Cão',
    })

    const send = await sendContact('3J8L5N2P', { message: 'Achei!' }).expect(
      201,
    )
    const messageId = (send.body as { messageId: string }).messageId

    // Inbox do tutor B está vazio (nenhuma mensagem de A vaza).
    const inboxB = await request(app.getHttpServer())
      .get('/contacts')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200)
    expect(inboxB.body as ContactMessageResponse[]).toEqual([])

    // Detalhe e leitura são proibidos (403).
    await request(app.getHttpServer())
      .get(`/contacts/${messageId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(403)
    await request(app.getHttpServer())
      .patch(`/contacts/${messageId}/read`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(403)
  })

  it('filtra o inbox por pet via ?petId=', async () => {
    const token = await createUser('u1', 'dono1@email.com', 'senhaForte123')
    const first = await activateAndAssociate(token, '7F4K9M2Q', 'X8P4-L2Q9', {
      name: 'Thor',
      species: 'Cão',
    })
    const second = await activateAndAssociate(token, '3J8L5N2P', 'X8P4-L2Q9', {
      name: 'Luna',
      species: 'Gato',
    })

    await sendContact('7F4K9M2Q', { message: 'Sobre o Thor' }).expect(201)
    await sendContact('3J8L5N2P', { message: 'Sobre a Luna' }).expect(201)

    const filtered = await request(app.getHttpServer())
      .get(`/contacts?petId=${first.petId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    const list = filtered.body as ContactMessageResponse[]
    expect(list).toHaveLength(1)
    expect(list[0].petId).toBe(first.petId)
    expect(list[0].message).toBe('Sobre o Thor')

    // Filtro do segundo pet retorna apenas a mensagem da Luna.
    const filtered2 = await request(app.getHttpServer())
      .get(`/contacts?petId=${second.petId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect((filtered2.body as ContactMessageResponse[])[0].message).toBe(
      'Sobre a Luna',
    )
  })

  it('retorna 400 ao enviar contato para tag não ativada', async () => {
    await createAvailableTag('5K9M2Q7X', 'X8P4-L2Q9')

    await sendContact('5K9M2Q7X', { message: 'Oi' }).expect(400)
  })

  it('retorna 404 para mensagem inexistente', async () => {
    const token = await createUser('u1', 'dono1@email.com', 'senhaForte123')

    await request(app.getHttpServer())
      .get('/contacts/inexistente')
      .set('Authorization', `Bearer ${token}`)
      .expect(404)
  })

  it('limita a 5 mensagens por hora por IP (429)', async () => {
    const token = await createUser('u1', 'dono1@email.com', 'senhaForte123')
    await activateAndAssociate(token, '2Q7X4P8L', 'X8P4-L2Q9', {
      name: 'Thor',
      species: 'Cão',
    })

    for (let i = 0; i < 5; i++) {
      await sendContact('2Q7X4P8L', { message: `msg ${i}` }).expect(201)
    }
    await sendContact('2Q7X4P8L', { message: '6ª mensagem' }).expect(429)
  })
})
