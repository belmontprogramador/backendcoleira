import 'dotenv/config'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../../../../infrastructure/database/prisma.service'
import { Pet } from '../../../domain/entities/pet.entity'
import { PetSpecies } from '../../../domain/value-objects/pet-species.vo'
import { PrismaPetRepository } from '../prisma-pet.repository'

describe('PrismaPetRepository (integração)', () => {
  let prisma: PrismaService
  let repository: PrismaPetRepository

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
    repository = new PrismaPetRepository(prisma)
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    await prisma.nfcTag.deleteMany()
    await prisma.batch.deleteMany()
    await prisma.petPrivacy.deleteMany()
    await prisma.pet.deleteMany()
    await prisma.user.deleteMany()
    // usuários donos (necessários para o FK pets.owner_id)
    for (const id of ['user-1', 'user-2']) {
      await prisma.user.create({
        data: {
          id,
          name: `Dono ${id}`,
          email: `${id}@email.com`,
          password_hash: 'x',
          status: 'ACTIVE',
        },
      })
    }
  })

  function makePet(ownerId: string, name: string): Pet {
    return Pet.create({
      id: `pet-${name}`,
      ownerId,
      name,
      species: PetSpecies.create('Cão'),
    })
  }

  it('salva um pet e o recupera por id (com privacy)', async () => {
    const pet = makePet('user-1', 'Thor')
    await repository.save(pet)

    const found = await repository.findById('pet-Thor')
    expect(found).not.toBeNull()
    expect(found?.id).toBe('pet-Thor')
    expect(found?.ownerId).toBe('user-1')
    expect(found?.name).toBe('Thor')
    expect(found?.species.value).toBe('Cão')
    // privacy padrão persiste
    expect(found?.privacy.showPhone).toBe(true)
    expect(found?.privacy.showCity).toBe(true)
  })

  it('lista pets por owner (sem deletados)', async () => {
    const thor = makePet('user-1', 'Thor')
    const loki = makePet('user-1', 'Loki')
    const outro = makePet('user-2', 'Rex')
    await repository.save(thor)
    await repository.save(loki)
    await repository.save(outro)

    const mine = await repository.listByOwner('user-1')
    expect(mine.map(p => p.name).sort()).toEqual(['Loki', 'Thor'])
  })

  it('omite pets deletados na listagem', async () => {
    const thor = makePet('user-1', 'Thor')
    const loki = makePet('user-1', 'Loki')
    await repository.save(thor)
    await repository.save(loki)

    loki.deactivate()
    await repository.save(loki)

    const mine = await repository.listByOwner('user-1')
    expect(mine.map(p => p.name)).toEqual(['Thor'])
  })

  it('listAll filtra por ownerId quando informado', async () => {
    await repository.save(makePet('user-1', 'Thor'))
    await repository.save(makePet('user-1', 'Loki'))
    await repository.save(makePet('user-2', 'Rex'))

    const filtered = await repository.listAll({
      page: 1,
      limit: 20,
      ownerId: 'user-1',
    })
    expect(filtered.map(p => p.name).sort()).toEqual(['Loki', 'Thor'])
  })

  it('listAll sem ownerId retorna todos', async () => {
    await repository.save(makePet('user-1', 'Thor'))
    await repository.save(makePet('user-2', 'Rex'))

    const all = await repository.listAll({ page: 1, limit: 20 })
    expect(all.map(p => p.name).sort()).toEqual(['Rex', 'Thor'])
  })

  it('persiste atualização de perfil e privacidade', async () => {
    const pet = makePet('user-1', 'Thor')
    await repository.save(pet)

    pet.updateProfile({ city: 'Araruama', description: 'Muito carinhoso' })
    pet.updatePrivacy({ showEmail: true })
    await repository.save(pet)

    const found = await repository.findById('pet-Thor')
    expect(found?.city).toBe('Araruama')
    expect(found?.description).toBe('Muito carinhoso')
    expect(found?.privacy.showEmail).toBe(true)
  })

  it('persiste modo perdido', async () => {
    const pet = makePet('user-1', 'Thor')
    await repository.save(pet)

    pet.markLost()
    await repository.save(pet)

    const found = await repository.findById('pet-Thor')
    expect(found?.lostStatus).toBe(true)
  })

  it('persiste soft delete', async () => {
    const pet = makePet('user-1', 'Thor')
    await repository.save(pet)

    pet.deactivate()
    await repository.save(pet)

    const found = await repository.findById('pet-Thor')
    expect(found?.deletedAt).not.toBeNull()
  })

  it('retorna null para id inexistente', async () => {
    const found = await repository.findById('nao-existe')
    expect(found).toBeNull()
  })
})
