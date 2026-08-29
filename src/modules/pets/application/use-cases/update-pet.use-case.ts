import { Inject, Injectable } from '@nestjs/common'
import { PET_REPOSITORY_PORT } from '../../domain/repositories/pet.repository.port'
import type { PetRepositoryPort } from '../../domain/repositories/pet.repository.port'
import { AUDIT_LOGGER_PORT } from '../../../../common/ports/audit-logger.port'
import type { AuditLoggerPort } from '../../../../common/ports/audit-logger.port'
import { PUBLIC_PROFILE_INVALIDATION_PORT } from '../../../../common/ports/public-profile-invalidation.port'
import type { PublicProfileInvalidationPort } from '../../../../common/ports/public-profile-invalidation.port'
import type { Pet } from '../../domain/entities/pet.entity'
import type { PetSex } from '../../domain/value-objects/pet-sex.vo'
import { PetNotFoundError } from '../errors'
import { PetOwnership } from '../policies/pet-ownership.policy'

export interface UpdatePetInput {
  name?: string
  species?: string
  breed?: string | null
  sex?: PetSex | null
  birthDate?: string | null
  description?: string | null
  city?: string | null
}

/**
 * Caso de uso: atualizar dados do próprio pet (ownership/anti-IDOR).
 */
@Injectable()
export class UpdatePetUseCase {
  constructor(
    @Inject(PET_REPOSITORY_PORT) private readonly pets: PetRepositoryPort,
    @Inject(AUDIT_LOGGER_PORT) private readonly audit: AuditLoggerPort,
    @Inject(PUBLIC_PROFILE_INVALIDATION_PORT)
    private readonly invalidation: PublicProfileInvalidationPort,
  ) {}

  async execute(
    actorId: string,
    petId: string,
    input: UpdatePetInput,
  ): Promise<Pet> {
    const pet = await this.pets.findById(petId)
    if (!pet) {
      throw new PetNotFoundError(petId)
    }
    PetOwnership.assertOwner(pet, actorId)

    pet.updateProfile({
      name: input.name,
      breed: input.breed,
      sex: input.sex,
      birthDate:
        input.birthDate !== undefined
          ? input.birthDate
            ? new Date(input.birthDate)
            : null
          : undefined,
      description: input.description,
      city: input.city,
    })
    await this.pets.save(pet)
    await this.invalidation.invalidateByPetId(petId)

    await this.audit.log({
      action: 'update',
      entity: 'pet',
      entityId: petId,
    })

    return pet
  }
}
