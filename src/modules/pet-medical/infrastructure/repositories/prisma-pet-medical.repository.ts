import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../../infrastructure/database/prisma.service'
import type { PetMedical } from '../../domain/entities/pet-medical.entity'
import type { PetMedicalRepositoryPort } from '../../domain/repositories/pet-medical.repository.port'
import { PetMedicalMapper } from '../mappers/pet-medical.mapper'

/**
 * Implementação concreta do `PetMedicalRepositoryPort` usando Prisma 7.
 * `pet_id` é a PK (1:1) — o `save` usa `upsert`.
 */
@Injectable()
export class PrismaPetMedicalRepository implements PetMedicalRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findByPetId(petId: string): Promise<PetMedical | null> {
    const model = await this.prisma.petMedical.findUnique({
      where: { pet_id: petId },
    })
    return model ? PetMedicalMapper.toDomain(model) : null
  }

  async save(medical: PetMedical): Promise<void> {
    const data = PetMedicalMapper.toPersistence(medical)
    await this.prisma.petMedical.upsert({
      where: { pet_id: medical.petId },
      create: data,
      update: data,
    })
  }
}
