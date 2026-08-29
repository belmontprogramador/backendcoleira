import { Inject, Injectable } from '@nestjs/common'
import { PET_REPOSITORY_PORT } from '../../domain/repositories/pet.repository.port'
import type { PetRepositoryPort } from '../../domain/repositories/pet.repository.port'
import type { Pet } from '../../domain/entities/pet.entity'
import { PetNotFoundError } from '../errors'

/**
 * Caso de uso: detalhar qualquer pet (administrativo, sem ownership).
 * Restrito a ADMIN/SUPER_ADMIN via guard na rota.
 */
@Injectable()
export class AdminGetPetUseCase {
  constructor(
    @Inject(PET_REPOSITORY_PORT) private readonly pets: PetRepositoryPort,
  ) {}

  async execute(petId: string): Promise<Pet> {
    const pet = await this.pets.findById(petId)
    if (!pet) {
      throw new PetNotFoundError(petId)
    }
    return pet
  }
}
