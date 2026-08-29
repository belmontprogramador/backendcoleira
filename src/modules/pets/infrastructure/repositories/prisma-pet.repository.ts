import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../../infrastructure/database/prisma.service'
import { Prisma } from '../../../../generated/prisma/client'
import type { Pet } from '../../domain/entities/pet.entity'
import type {
  PetListFilter,
  PetRepositoryPort,
} from '../../domain/repositories/pet.repository.port'
import { PetMapper } from '../mappers/pet.mapper'

/**
 * Implementação concreta do `PetRepositoryPort` usando Prisma 7.
 * Persiste o agregado Pet junto com a privacy (relação 1:1).
 */
@Injectable()
export class PrismaPetRepository implements PetRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Pet | null> {
    const model = await this.prisma.pet.findUnique({
      where: { id },
      include: { privacy: true },
    })
    return model ? PetMapper.toDomain(model) : null
  }

  async listByOwner(ownerId: string): Promise<Pet[]> {
    const models = await this.prisma.pet.findMany({
      where: { owner_id: ownerId, deleted_at: null },
      include: { privacy: true },
      orderBy: { created_at: 'desc' },
    })
    return models.map(PetMapper.toDomain)
  }

  async listAll(filter: PetListFilter): Promise<Pet[]> {
    const where: Prisma.PetWhereInput = { deleted_at: null }
    if (filter.ownerId) {
      where.owner_id = filter.ownerId
    }
    const models = await this.prisma.pet.findMany({
      where,
      include: { privacy: true },
      skip: (filter.page - 1) * filter.limit,
      take: filter.limit,
      orderBy: { created_at: 'desc' },
    })
    return models.map(PetMapper.toDomain)
  }

  async save(pet: Pet): Promise<void> {
    const data = PetMapper.toPersistence(pet)
    const privacyData = PetMapper.privacyToPersistence(pet)

    await this.prisma.$transaction([
      this.prisma.pet.upsert({
        where: { id: pet.id },
        create: data,
        update: data,
      }),
      this.prisma.petPrivacy.upsert({
        where: { pet_id: pet.id },
        create: { pet_id: pet.id, ...privacyData },
        update: privacyData,
      }),
    ])
  }
}
