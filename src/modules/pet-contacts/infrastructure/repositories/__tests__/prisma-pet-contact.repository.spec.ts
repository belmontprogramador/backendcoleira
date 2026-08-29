import 'dotenv/config'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../../../../infrastructure/database/prisma.service'
import { PetContact } from '../../../domain/entities/pet-contact.entity'
import { PrismaPetContactRepository } from '../prisma-pet-contact.repository'

describe('PetContact — repositório (integração)', () => {
  let prisma: PrismaService
  let repo: PrismaPetContactRepository

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
    repo = new PrismaPetContactRepository(prisma)
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

  it('cria, atualiza, lista e remove contatos do pet', async () => {
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

    const c1 = PetContact.create({ id: 'c-1', petId: 'pet-1', name: 'João' })
    await repo.save(c1)
    const c2 = PetContact.create({ id: 'c-2', petId: 'pet-1', name: 'Maria' })
    await repo.save(c2)

    const list = await repo.listByPet('pet-1')
    expect(list).toHaveLength(2)
    expect(list.map(c => c.name).sort()).toEqual(['João', 'Maria'])

    const c1Found = await repo.findById('c-1')
    expect(c1Found?.name).toBe('João')
    c1Found!.update({ name: 'João S.', isPrimary: true })
    await repo.save(c1Found!)

    expect((await repo.findById('c-1'))?.name).toBe('João S.')
    expect((await repo.findById('c-1'))?.isPrimary).toBe(true)

    await repo.delete('c-1')
    expect(await repo.findById('c-1')).toBeNull()
    expect(await repo.listByPet('pet-1')).toHaveLength(1)
  })

  it('findById retorna null quando não existe', async () => {
    expect(await repo.findById('missing')).toBeNull()
  })
})
