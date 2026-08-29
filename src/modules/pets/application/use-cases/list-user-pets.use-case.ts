import { Inject, Injectable } from '@nestjs/common'
import { PET_REPOSITORY_PORT } from '../../domain/repositories/pet.repository.port'
import type { PetRepositoryPort } from '../../domain/repositories/pet.repository.port'
import type { Pet } from '../../domain/entities/pet.entity'

/**
 * Caso de uso: listar os pets do usuário autenticado.
 */
@Injectable()
export class ListUserPetsUseCase {
  constructor(
    @Inject(PET_REPOSITORY_PORT) private readonly pets: PetRepositoryPort,
  ) {}

  async execute(actorId: string): Promise<Pet[]> {
    return this.pets.listByOwner(actorId)
  }
}
