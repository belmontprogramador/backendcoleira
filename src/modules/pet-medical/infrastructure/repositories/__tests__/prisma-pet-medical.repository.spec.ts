import 'dotenv/config'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../../../../infrastructure/database/prisma.service'
import { PetMedical } from '../../../domain/entities/pet-medical.entity'
import { PrismaPetMedicalRepository } from '../prisma-pet-medical.repository'

describe('PetMedical — repositório (integração)', () => {
  let prisma: PrismaService
  let repo: PrismaPetMedicalRepository

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
    repo = new PrismaPetMedicalRepository(prisma)
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    await prisma.paymentTransaction.deleteMany()
    await prisma.subscription.deleteMany()
    await prisma.planFeature.deleteMany()
    await prisma.plan.deleteMany()
    await prisma.feature.deleteMany()
    await prisma.webhookEvent.deleteMany()
    await prisma.petContact.deleteMany()
    await prisma.petMedical.deleteMany()
    await prisma.accessEvent.deleteMany()
    await prisma.contactMessage.deleteMany()
    await prisma.nfcTag.deleteMany()
    await prisma.batch.deleteMany()
    await prisma.petPrivacy.deleteMany()
    await prisma.pet.deleteMany()
    await prisma.rolePermission.deleteMany()
    await prisma.userRole.deleteMany()
    await prisma.permission.deleteMany()
    await prisma.role.deleteMany()
    await prisma.user.deleteMany()
  })

  it('upsert cria e atualiza um PetMedical', async () => {
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

    const m = PetMedical.create({ petId: 'pet-1', allergies: 'pólen' })
    await repo.save(m)

    const found = await repo.findByPetId('pet-1')
    expect(found).not.toBeNull()
    expect(found?.allergies).toBe('pólen')
    expect(found?.medications).toBeNull()

    found!.update({ medications: 'X' })
    await repo.save(found!)

    const updated = await repo.findByPetId('pet-1')
    expect(updated?.allergies).toBe('pólen')
    expect(updated?.medications).toBe('X')
  })

  it('findByPetId retorna null quando não existe', async () => {
    expect(await repo.findByPetId('missing')).toBeNull()
  })
})
