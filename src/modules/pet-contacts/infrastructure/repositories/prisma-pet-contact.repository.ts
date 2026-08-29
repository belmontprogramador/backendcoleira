import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../../infrastructure/database/prisma.service'
import type { PetContact } from '../../domain/entities/pet-contact.entity'
import type { PetContactRepositoryPort } from '../../domain/repositories/pet-contact.repository.port'
import { PetContactMapper } from '../mappers/pet-contact.mapper'

/**
 * Implementação concreta do `PetContactRepositoryPort` usando Prisma 7.
 */
@Injectable()
export class PrismaPetContactRepository implements PetContactRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async listByPet(petId: string): Promise<PetContact[]> {
    const models = await this.prisma.petContact.findMany({
      where: { pet_id: petId },
      orderBy: { created_at: 'asc' },
    })
    return models.map(PetContactMapper.toDomain)
  }

  async findById(id: string): Promise<PetContact | null> {
    const model = await this.prisma.petContact.findUnique({ where: { id } })
    return model ? PetContactMapper.toDomain(model) : null
  }

  async save(contact: PetContact): Promise<void> {
    const data = PetContactMapper.toPersistence(contact)
    await this.prisma.petContact.upsert({
      where: { id: contact.id },
      create: data,
      update: data,
    })
  }

  async delete(id: string): Promise<void> {
    await this.prisma.petContact.delete({ where: { id } })
  }
}
