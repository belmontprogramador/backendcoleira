import { Inject, Injectable } from '@nestjs/common'
import { PET_REPOSITORY_PORT } from '../../domain/repositories/pet.repository.port'
import type { PetRepositoryPort } from '../../domain/repositories/pet.repository.port'
import type { Pet } from '../../domain/entities/pet.entity'
import { PetNotFoundError } from '../errors'
import { PetOwnership } from '../policies/pet-ownership.policy'

/**
 * Caso de uso: detalhar um pet (somente o proprietário).
 * Aplica ownership: o ator só vê o próprio pet (anti-IDOR).
 */
@Injectable()
export class GetPetUseCase {
  constructor(
    @Inject(PET_REPOSITORY_PORT) private readonly pets: PetRepositoryPort,
  ) {}

  async execute(actorId: string, petId: string): Promise<Pet> {
    const pet = await this.pets.findById(petId)
    if (!pet) {
      throw new PetNotFoundError(petId)
    }
    PetOwnership.assertOwner(pet, actorId)
    return pet
  }
}
