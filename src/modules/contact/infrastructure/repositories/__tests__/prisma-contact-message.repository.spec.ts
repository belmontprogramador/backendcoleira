import 'dotenv/config'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../../../../infrastructure/database/prisma.service'
import { ContactMessage } from '../../../domain/entities/contact-message.entity'
import { AccessSource } from '../../../../../common/constants/access-source'
import { PrismaContactMessageRepository } from '../prisma-contact-message.repository'

describe('ContactMessage — repositório (integração)', () => {
  let prisma: PrismaService
  let repo: PrismaContactMessageRepository

  const config = {
    getOrThrow: (key: string) => {
      const map: Record<string, string> = {
        DATABASE_URL: process.env.DATABASE_URL ?? '',
      }
      return map[key]
    },
  } as unknown as ConfigService

  beforeAll(() => {
    prisma = new PrismaService(config)
    repo = new PrismaContactMessageRepository(prisma)
  })

  afterAll(async () => {
    await prisma.accessEvent.deleteMany()
    await prisma.contactMessage.deleteMany()
    await prisma.nfcTag.deleteMany()
    await prisma.batch.deleteMany()
    await prisma.petPrivacy.deleteMany()
    await prisma.pet.deleteMany()
    await prisma.user.deleteMany()
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    await prisma.accessEvent.deleteMany()
    await prisma.contactMessage.deleteMany()
    await prisma.nfcTag.deleteMany()
    await prisma.batch.deleteMany()
    await prisma.petPrivacy.deleteMany()
    await prisma.pet.deleteMany()
    await prisma.user.deleteMany()
  })

  async function seedPet(): Promise<void> {
    await prisma.user.create({
      data: {
        id: 'owner-1',
        name: 'Owner',
        email: 'owner@email.com',
        password_hash: 'x',
        status: 'ACTIVE',
      },
    })
    await prisma.pet.create({
      data: { id: 'pet-1', owner_id: 'owner-1', name: 'Thor', species: 'Cão' },
    })
  }

  function makeMessage(id = 'msg-1'): ContactMessage {
    return ContactMessage.create({
      id,
      petId: 'pet-1',
      message: 'Achei seu cachorro!',
      source: AccessSource.QR,
      senderName: 'Ana',
      senderPhone: '(21) 98888-7777',
    })
  }

  async function insertWithDate(id: string, createdAt: Date): Promise<void> {
    await repo.save(
      ContactMessage.reconstitute({
        id,
        petId: 'pet-1',
        nfcTagId: null,
        senderName: null,
        senderPhone: null,
        senderEmail: null,
        message: `mensagem ${id}`,
        source: AccessSource.DIRECT,
        ipHash: null,
        userAgent: null,
        readAt: null,
        createdAt,
      }),
    )
  }

  it('salva uma mensagem nova (create)', async () => {
    await seedPet()
    await repo.save(makeMessage())

    const found = await prisma.contactMessage.findUnique({
      where: { id: 'msg-1' },
    })
    expect(found).not.toBeNull()
    expect(found?.pet_id).toBe('pet-1')
    expect(found?.message).toBe('Achei seu cachorro!')
    expect(found?.sender_name).toBe('Ana')
    expect(found?.sender_phone).toBe('(21) 98888-7777')
    expect(found?.source).toBe('QR')
    expect(found?.read_at).toBeNull()
  })

  it('upsert persiste markRead sem duplicar a mensagem', async () => {
    await seedPet()
    const msg = makeMessage()
    await repo.save(msg)

    msg.markRead()
    await repo.save(msg)

    const found = await prisma.contactMessage.findUnique({
      where: { id: 'msg-1' },
    })
    expect(found?.read_at).not.toBeNull()

    const count = await prisma.contactMessage.count({
      where: { id: 'msg-1' },
    })
    expect(count).toBe(1)
  })

  it('findById retorna a mensagem mapeada para o domínio', async () => {
    await seedPet()
    await repo.save(makeMessage())

    const msg = await repo.findById('msg-1')
    expect(msg).not.toBeNull()
    expect(msg?.id).toBe('msg-1')
    expect(msg?.petId).toBe('pet-1')
    expect(msg?.message).toBe('Achei seu cachorro!')
    expect(msg?.senderName).toBe('Ana')
    expect(msg?.source).toBe(AccessSource.QR)
  })

  it('findById retorna null para id inexistente', async () => {
    const msg = await repo.findById('inexistente')
    expect(msg).toBeNull()
  })

  it('listByPet retorna paginado em ordem desc (mais recente primeiro)', async () => {
    await seedPet()
    await insertWithDate('msg-old', new Date('2026-01-01T00:00:00Z'))
    await insertWithDate('msg-new', new Date('2026-02-01T00:00:00Z'))

    const page1 = await repo.listByPet('pet-1', 1, 1)
    expect(page1.map(m => m.id)).toEqual(['msg-new'])

    const page2 = await repo.listByPet('pet-1', 2, 1)
    expect(page2.map(m => m.id)).toEqual(['msg-old'])
  })

  it('listByPet filtra por pet', async () => {
    await seedPet()
    await prisma.pet.create({
      data: { id: 'pet-2', owner_id: 'owner-1', name: 'Luna', species: 'Gato' },
    })
    await insertWithDate('msg-pet1', new Date('2026-01-01T00:00:00Z'))
    await repo.save(
      ContactMessage.reconstitute({
        id: 'msg-pet2',
        petId: 'pet-2',
        nfcTagId: null,
        senderName: null,
        senderPhone: null,
        senderEmail: null,
        message: 'mensagem outro pet',
        source: AccessSource.DIRECT,
        ipHash: null,
        userAgent: null,
        readAt: null,
        createdAt: new Date('2026-02-01T00:00:00Z'),
      }),
    )

    const list = await repo.listByPet('pet-1', 1, 10)
    expect(list.map(m => m.id)).toEqual(['msg-pet1'])
  })

  it('listByOwner retorna mensagens de todos os pets do dono (ordem desc)', async () => {
    await seedPet()
    await prisma.pet.create({
      data: { id: 'pet-2', owner_id: 'owner-1', name: 'Luna', species: 'Gato' },
    })
    await insertWithDate('msg-pet1', new Date('2026-01-01T00:00:00Z'))
    await repo.save(
      ContactMessage.reconstitute({
        id: 'msg-pet2',
        petId: 'pet-2',
        nfcTagId: null,
        senderName: null,
        senderPhone: null,
        senderEmail: null,
        message: 'mensagem outro pet',
        source: AccessSource.DIRECT,
        ipHash: null,
        userAgent: null,
        readAt: null,
        createdAt: new Date('2026-02-01T00:00:00Z'),
      }),
    )

    const list = await repo.listByOwner('owner-1', 1, 10)
    expect(list.map(m => m.id)).toEqual(['msg-pet2', 'msg-pet1'])
  })
})
