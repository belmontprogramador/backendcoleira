import type { Pet } from '../entities/pet.entity'

/**
 * Porta do repositório de pets.
 *
 * DIP: domínio/aplicação dependem desta interface; a implementação concreta
 * (Prisma) vive na infraestrutura.
 */
export interface PetListFilter {
  page: number
  limit: number
  ownerId?: string
}

export interface PetRepositoryPort {
  findById(id: string): Promise<Pet | null>
  listByOwner(ownerId: string): Promise<Pet[]>
  listAll(filter: PetListFilter): Promise<Pet[]>
  save(pet: Pet): Promise<void>
}

export const PET_REPOSITORY_PORT = Symbol('PET_REPOSITORY_PORT')
