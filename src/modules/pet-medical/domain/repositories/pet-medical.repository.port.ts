import type { PetMedical } from '../entities/pet-medical.entity'

/**
 * Porta do repositório de dados médicos (feature Premium `PET_MEDICAL`).
 * DIP: aplicação depende desta interface; a implementação Prisma vive na
 * infraestrutura.
 */
export interface PetMedicalRepositoryPort {
  findByPetId(petId: string): Promise<PetMedical | null>
  save(medical: PetMedical): Promise<void>
}

export const PET_MEDICAL_REPOSITORY_PORT = Symbol('PET_MEDICAL_REPOSITORY_PORT')
