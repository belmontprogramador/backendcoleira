import 'dotenv/config'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../../../../infrastructure/database/prisma.service'
import { NfcTag, TagStatus } from '../../../domain/entities/nfc-tag.entity'
import { Batch, BatchStatus } from '../../../domain/entities/batch.entity'
import { PublicId } from '../../../domain/value-objects/public-id.vo'
import { Uid } from '../../../domain/value-objects/uid.vo'
import { PrismaNfcTagRepository } from '../prisma-nfc-tag.repository'
import { PrismaBatchRepository } from '../prisma-batch.repository'

describe('NFC — repositórios (integração)', () => {
  let prisma: PrismaService
  let tagRepo: PrismaNfcTagRepository
  let batchRepo: PrismaBatchRepository

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
    tagRepo = new PrismaNfcTagRepository(prisma)
    batchRepo = new PrismaBatchRepository(prisma)
  })

  afterAll(async () => {
    await prisma.nfcTag.deleteMany()
    await prisma.batch.deleteMany()
    await prisma.petPrivacy.deleteMany()
    await prisma.pet.deleteMany()
    await prisma.user.deleteMany()
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    await prisma.nfcTag.deleteMany()
    await prisma.batch.deleteMany()
    await prisma.petPrivacy.deleteMany()
    await prisma.pet.deleteMany()
    await prisma.user.deleteMany()
    await prisma.user.create({
      data: {
        id: 'operator-1',
        name: 'Operator',
        email: 'operator@email.com',
        password_hash: 'x',
        status: 'ACTIVE',
      },
    })
    // lote base (FK das tags)
    await batchRepo.save(makeBatch())
  })

  function makeBatch(): Batch {
    return Batch.create({
      id: 'batch-1',
      name: 'Lote 001',
      quantity: 10,
      createdBy: 'operator-1',
    })
  }

  it('salva e recupera um lote', async () => {
    const batch = makeBatch()
    await batchRepo.save(batch)

    const found = await batchRepo.findById('batch-1')
    expect(found).not.toBeNull()
    expect(found?.name).toBe('Lote 001')
    expect(found?.status).toBe(BatchStatus.PENDING)
    expect(found?.quantity).toBe(10)
  })

  it('recupera lote por nome', async () => {
    await batchRepo.save(makeBatch())
    const found = await batchRepo.findByName('Lote 001')
    expect(found?.id).toBe('batch-1')
  })

  it('lista lotes com paginação e filtro de status', async () => {
    await batchRepo.save(makeBatch())

    const list = await batchRepo.list({ page: 1, limit: 20 })
    expect(list).toHaveLength(1)

    const filtered = await batchRepo.list({
      status: 'PENDING',
      page: 1,
      limit: 20,
    })
    expect(filtered).toHaveLength(1)

    const none = await batchRepo.list({
      status: 'COMPLETED',
      page: 1,
      limit: 20,
    })
    expect(none).toHaveLength(0)
  })

  it('salva e recupera tag por id, publicId e uid', async () => {
    const tag = NfcTag.create({
      id: 'tag-1',
      publicId: PublicId.create('7F4K9M2Q'),
      activationCodeEncrypted: 'encrypted',
      batchId: 'batch-1',
    })
    await tagRepo.save(tag)

    const byId = await tagRepo.findById('tag-1')
    expect(byId?.publicId.value).toBe('7F4K9M2Q')

    const byPublicId = await tagRepo.findByPublicId('7F4K9M2Q')
    expect(byPublicId?.id).toBe('tag-1')

    // ainda não tem uid
    const byUid = await tagRepo.findByUid('04:A7:32:91:8B:1F')
    expect(byUid).toBeNull()
  })

  it('salva em massa e lista por batch', async () => {
    const tags = Array.from({ length: 3 }, (_, i) =>
      NfcTag.create({
        id: `tag-${i}`,
        publicId: PublicId.create(`7F4K9M2${['Q', 'W', 'E'][i]}`),
        activationCodeEncrypted: `encrypted-${i}`,
        batchId: 'batch-1',
      }),
    )
    await tagRepo.saveMany(tags)

    const byBatch = await tagRepo.listByBatch('batch-1')
    expect(byBatch).toHaveLength(3)
  })

  it('persiste uid e transição de status', async () => {
    const tag = NfcTag.create({
      id: 'tag-1',
      publicId: PublicId.create('7F4K9M2Q'),
      activationCodeEncrypted: 'encrypted',
      batchId: 'batch-1',
    })
    await tagRepo.save(tag)

    tag.markWritten(Uid.create('04:A7:32:91:8B:1F'))
    await tagRepo.save(tag)

    const found = await tagRepo.findById('tag-1')
    expect(found?.uid?.value).toBe('04:A7:32:91:8B:1F')
    expect(found?.status).toBe(TagStatus.READY)
  })

  it('lista tags por pet', async () => {
    await prisma.pet.create({
      data: {
        id: 'pet-1',
        owner_id: 'operator-1',
        name: 'Thor',
        species: 'Cão',
      },
    })
    const tag = NfcTag.reconstitute({
      id: 'tag-1',
      publicId: PublicId.create('7F4K9M2Q'),
      uid: null,
      activationCodeEncrypted: 'encrypted',
      status: TagStatus.ACTIVE,
      batchId: 'batch-1',
      ownerId: 'operator-1',
      petId: 'pet-1',
      activatedAt: null,
      deactivatedAt: null,
      resetAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    await tagRepo.save(tag)

    const byPet = await tagRepo.listByPet('pet-1')
    expect(byPet).toHaveLength(1)
    expect(byPet[0].publicId.value).toBe('7F4K9M2Q')
  })
})
