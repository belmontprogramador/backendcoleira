import 'dotenv/config'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../../../../infrastructure/database/prisma.service'
import { AccessEvent } from '../../../domain/entities/access-event.entity'
import { AccessSource } from '../../../../../common/constants/access-source'
import { PrismaAccessEventRepository } from '../prisma-access-event.repository'

describe('AccessEvent — repositório (integração)', () => {
  let prisma: PrismaService
  let repo: PrismaAccessEventRepository

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
    repo = new PrismaAccessEventRepository(prisma)
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

  it('persiste um AccessEvent sem relações', async () => {
    const event = AccessEvent.create({
      id: 'ev-1',
      source: AccessSource.DIRECT,
      ipHash: 'hash',
    })
    await repo.create(event)

    const found = await prisma.accessEvent.findUnique({
      where: { id: 'ev-1' },
    })
    expect(found).not.toBeNull()
    expect(found?.source).toBe('DIRECT')
    expect(found?.ip_hash).toBe('hash')
    expect(found?.pet_id).toBeNull()
    expect(found?.nfc_tag_id).toBeNull()
  })

  it('persiste um AccessEvent com pet e tag', async () => {
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
    await prisma.nfcTag.create({
      data: {
        id: 'tag-1',
        public_id: '7F4K9M2Q',
        activation_code_encrypted: 'x',
        status: 'ACTIVE',
        pet_id: 'pet-1',
      },
    })

    const event = AccessEvent.create({
      id: 'ev-2',
      petId: 'pet-1',
      nfcTagId: 'tag-1',
      source: AccessSource.NFC,
      deviceType: 'iPhone',
    })
    await repo.create(event)

    const found = await prisma.accessEvent.findUnique({
      where: { id: 'ev-2' },
    })
    expect(found?.pet_id).toBe('pet-1')
    expect(found?.nfc_tag_id).toBe('tag-1')
    expect(found?.device_type).toBe('iPhone')
  })

  it('busca um AccessEvent por id (findById)', async () => {
    await prisma.accessEvent.create({
      data: { id: 'ev-find', source: 'DIRECT' },
    })

    const found = await repo.findById('ev-find')

    expect(found?.id).toBe('ev-find')
    expect(found?.source).toBe(AccessSource.DIRECT)
  })

  it('retorna null no findById quando o evento não existe', async () => {
    await expect(repo.findById('ev-missing')).resolves.toBeNull()
  })

  it('atualiza as coordenadas GPS de um AccessEvent (updateLocation)', async () => {
    await prisma.accessEvent.create({
      data: { id: 'ev-loc', source: 'DIRECT' },
    })

    await repo.updateLocation('ev-loc', -22.9068, -43.1729)

    const found = await prisma.accessEvent.findUnique({
      where: { id: 'ev-loc' },
    })
    expect(found?.latitude).toBe(-22.9068)
    expect(found?.longitude).toBe(-43.1729)
  })

  it('lista eventos de um pet em ordem desc de criação', async () => {
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
    await prisma.pet.create({
      data: { id: 'pet-2', owner_id: 'owner-1', name: 'Loki', species: 'Cão' },
    })
    await prisma.accessEvent.create({
      data: {
        id: 'ev-1',
        pet_id: 'pet-1',
        source: 'NFC',
        created_at: new Date('2026-01-01T00:00:00Z'),
      },
    })
    await prisma.accessEvent.create({
      data: {
        id: 'ev-2',
        pet_id: 'pet-1',
        source: 'QR',
        created_at: new Date('2026-02-01T00:00:00Z'),
      },
    })
    await prisma.accessEvent.create({
      data: { id: 'ev-3', pet_id: 'pet-2', source: 'DIRECT' },
    })

    const list = await repo.listByPet('pet-1')

    expect(list.map(e => e.id)).toEqual(['ev-2', 'ev-1'])
    expect(list).toHaveLength(2)
  })
})
