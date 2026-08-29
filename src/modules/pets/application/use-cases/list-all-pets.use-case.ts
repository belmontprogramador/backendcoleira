import { Inject, Injectable } from '@nestjs/common'
import { PET_REPOSITORY_PORT } from '../../domain/repositories/pet.repository.port'
import type {
  PetListFilter,
  PetRepositoryPort,
} from '../../domain/repositories/pet.repository.port'
import type { Pet } from '../../domain/entities/pet.entity'

/**
 * Caso de uso: listar todos os pets (administrativo, com paginação).
 */
@Injectable()
export class ListAllPetsUseCase {
  constructor(
    @Inject(PET_REPOSITORY_PORT) private readonly pets: PetRepositoryPort,
  ) {}

  async execute(filter: PetListFilter): Promise<Pet[]> {
    return this.pets.listAll(filter)
  }
}
