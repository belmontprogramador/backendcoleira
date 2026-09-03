import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import * as bcrypt from 'bcrypt'
import request from 'supertest'
import { App } from 'supertest/types'
import { AppModule } from './../src/app.module'
import { PrismaService } from './../src/infrastructure/database/prisma.service'
import { AesGcmActivationCodeCipher } from './../src/modules/nfc/infrastructure/generators/activation-code-cipher'
import { flushRedis } from './helpers/flush-redis'
import { makePremium } from './helpers/make-premium'

type AuthBody = { accessToken: string; refreshToken: string }

describe('Perfil público (e2e)', () => {
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
    await prisma.subscription.deleteMany()
    await prisma.planFeature.deleteMany()
    await prisma.plan.deleteMany()
    await prisma.feature.deleteMany()
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
    pet: { name: string; species: string; breed?: string; city?: string },
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

  async function makePremiumFeatures(
    userId: string,
    codes: string[],
  ): Promise<void> {
    const featureIds: string[] = []
    for (const code of codes) {
      const f = await prisma.feature.create({
        data: { code, name: code },
      })
      featureIds.push(f.id)
    }
    const plan = await prisma.plan.create({
      data: {
        code: 'PREMIUM',
        name: 'Premium',
        price_cents: 1990,
        is_default: false,
      },
    })
    for (const featureId of featureIds) {
      await prisma.planFeature.create({
        data: { plan_id: plan.id, feature_id: featureId },
      })
    }
    const now = new Date()
    await prisma.subscription.create({
      data: {
        user_id: userId,
        plan_id: plan.id,
        provider: 'MERCADO_PAGO',
        status: 'ACTIVE',
        started_at: now,
        current_period_start: now,
        current_period_end: new Date(
          now.getTime() + 30 * 24 * 60 * 60 * 1000,
        ),
      },
    })
  }

  it('retorna perfil ativo em snake_case sem autenticação', async () => {
    const token = await createUser(
      'u1',
      'dono1@email.com',
      'senhaForte123',
      '+5521999999999',
    )
    await activateAndAssociate(token, '7F4K9M2Q', 'X8P4-L2Q9', {
      name: 'Thor',
      species: 'Cão',
      breed: 'Shih Tzu',
      city: 'Araruama - RJ',
    })

    const res = await request(app.getHttpServer())
      .get('/p/7F4K9M2Q')
      .expect(200)

    expect(res.body).toEqual({
      status: 'ACTIVE',
      pet: {
        name: 'Thor',
        species: 'Cão',
        breed: 'Shih Tzu',
        sex: null,
        photo_url: null,
        description: null,
        city: 'Araruama - RJ',
        lost_status: false,
      },
      owner: {
        name: 'Dono dono1@email.com',
        phone: '+5521999999999',
        email: 'dono1@email.com',
      },
      message: null,
      contact_enabled: false,
      medical: null,
      contacts: [],
    })
    expect(res.body).not.toHaveProperty('kind')
    expect(res.body).not.toHaveProperty('activation_code_encrypted')
  })

  it('habilita contato (contact_enabled=true) quando o dono é Premium', async () => {
    const token = await createUser(
      'u1',
      'dono1@email.com',
      'senhaForte123',
      '+5521999999999',
    )
    await makePremium(prisma, 'u1')
    await activateAndAssociate(token, '7F4K9M2Q', 'X8P4-L2Q9', {
      name: 'Thor',
      species: 'Cão',
    })

    const res = await request(app.getHttpServer())
      .get('/p/7F4K9M2Q')
      .expect(200)

    expect((res.body as { contact_enabled: boolean }).contact_enabled).toBe(
      true,
    )
  })

  it('expõe dados médicos e contatos (premium) no perfil público', async () => {
    const token = await createUser(
      'u1',
      'dono1@email.com',
      'senhaForte123',
      '+5521999999999',
    )
    await makePremiumFeatures('u1', [
      'CONTACT_MESSAGES',
      'PET_MEDICAL',
      'MULTIPLE_CONTACTS',
    ])
    const { petId } = await activateAndAssociate(
      token,
      '7F4K9M2Q',
      'X8P4-L2Q9',
      { name: 'Thor', species: 'Cão' },
    )

    await request(app.getHttpServer())
      .patch(`/pets/${petId}/privacy`)
      .set('Authorization', `Bearer ${token}`)
      .send({ showMedical: true, showVeterinarian: true, showContacts: true })
      .expect(200)

    await prisma.petMedical.create({
      data: {
        pet_id: petId,
        allergies: 'Dipirona',
        medications: 'Vermífugo',
        special_care: 'Não dar chocolate',
        medical_conditions: 'Nenhuma',
        veterinarian_name: 'Dra. Ana',
        veterinarian_phone: '(21) 98888-7777',
      },
    })
    await prisma.petContact.create({
      data: {
        pet_id: petId,
        name: 'Maria (mãe)',
        phone: '(21) 97777-6666',
        email: 'maria@example.com',
        relationship: 'Família',
        is_primary: true,
      },
    })

    const res = await request(app.getHttpServer())
      .get('/p/7F4K9M2Q')
      .expect(200)
    const body = res.body as {
      contact_enabled: boolean
      medical: unknown
      contacts: unknown[]
    }

    expect(body.contact_enabled).toBe(true)
    expect(body.medical).toEqual({
      allergies: 'Dipirona',
      medications: 'Vermífugo',
      special_care: 'Não dar chocolate',
      medical_conditions: 'Nenhuma',
      veterinarian_name: 'Dra. Ana',
      veterinarian_phone: '(21) 98888-7777',
    })
    expect(body.contacts).toEqual([
      {
        name: 'Maria (mãe)',
        phone: '(21) 97777-6666',
        email: 'maria@example.com',
        relationship: 'Família',
      },
    ])
  })

  it('invalida o cache quando a privacidade muda', async () => {
    const token = await createUser(
      'u1',
      'dono1@email.com',
      'senhaForte123',
      '+5521999999999',
    )
    const { petId } = await activateAndAssociate(
      token,
      '7F4K9M2Q',
      'X8P4-L2Q9',
      { name: 'Thor', species: 'Cão' },
    )

    // 1ª chamada popula o cache (phone visível por padrão).
    const first = await request(app.getHttpServer())
      .get('/p/7F4K9M2Q')
      .expect(200)
    const firstBody = first.body as { owner: { phone: string | null } }
    expect(firstBody.owner.phone).toBe('+5521999999999')

    // Altera a privacidade → invalida o cache.
    await request(app.getHttpServer())
      .patch(`/pets/${petId}/privacy`)
      .set('Authorization', `Bearer ${token}`)
      .send({ showPhone: false })
      .expect(200)

    // 2ª chamada reflete a mudança (phone oculto).
    const second = await request(app.getHttpServer())
      .get('/p/7F4K9M2Q')
      .expect(200)
    const secondBody = second.body as { owner: { phone: string | null } }
    expect(secondBody.owner.phone).toBeNull()
  })

  it('retorna pingente virgem (pet/owner null) para tag sem pet', async () => {
    await createAvailableTag('7F4K9M2Q', 'X8P4-L2Q9')

    const res = await request(app.getHttpServer())
      .get('/p/7F4K9M2Q')
      .expect(200)

    expect(res.body).toEqual({
      status: 'AVAILABLE',
      pet: null,
      owner: null,
      message: 'Este pingente ainda não foi ativado',
      contact_enabled: false,
      medical: null,
      contacts: [],
    })
  })

  it('não vaza dados quando o pet é soft-deletado', async () => {
    const token = await createUser(
      'u1',
      'dono1@email.com',
      'senhaForte123',
      '+5521999999999',
    )
    const { petId } = await activateAndAssociate(
      token,
      '7F4K9M2Q',
      'X8P4-L2Q9',
      { name: 'Thor', species: 'Cão' },
    )

    await request(app.getHttpServer())
      .delete(`/pets/${petId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204)

    const res = await request(app.getHttpServer())
      .get('/p/7F4K9M2Q')
      .expect(200)
    const body = res.body as {
      pet: unknown
      owner: unknown
      message: string
    }
    expect(body.pet).toBeNull()
    expect(body.owner).toBeNull()
    expect(body.message).toBe('Este pingente ainda não foi ativado')
  })

  it('retorna 404 para public ID inexistente', async () => {
    await request(app.getHttpServer()).get('/p/ZZZZZZZZ').expect(404)
  })

  it('retorna 400 para public ID com formato inválido', async () => {
    await request(app.getHttpServer()).get('/p/ABC').expect(400)
  })
})
