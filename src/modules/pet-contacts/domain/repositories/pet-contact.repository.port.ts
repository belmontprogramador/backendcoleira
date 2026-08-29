import type { PetContact } from '../entities/pet-contact.entity'

/**
 * Porta do repositório de contatos do pet (feature Premium `MULTIPLE_CONTACTS`).
 * DIP: aplicação depende desta interface; a implementação Prisma vive na
 * infraestrutura.
 */
export interface PetContactRepositoryPort {
  listByPet(petId: string): Promise<PetContact[]>
  findById(id: string): Promise<PetContact | null>
  save(contact: PetContact): Promise<void>
  delete(id: string): Promise<void>
}

export const PET_CONTACT_REPOSITORY_PORT = Symbol('PET_CONTACT_REPOSITORY_PORT')
