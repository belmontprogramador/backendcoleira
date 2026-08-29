import { Inject, Injectable } from '@nestjs/common'
import { PET_REPOSITORY_PORT } from '../../domain/repositories/pet.repository.port'
import type { PetRepositoryPort } from '../../domain/repositories/pet.repository.port'
import { AUDIT_LOGGER_PORT } from '../../../../common/ports/audit-logger.port'
import type { AuditLoggerPort } from '../../../../common/ports/audit-logger.port'
import { PUBLIC_PROFILE_INVALIDATION_PORT } from '../../../../common/ports/public-profile-invalidation.port'
import type { PublicProfileInvalidationPort } from '../../../../common/ports/public-profile-invalidation.port'
import type { Pet } from '../../domain/entities/pet.entity'
import { PetNotFoundError } from '../errors'
import { PetOwnership } from '../policies/pet-ownership.policy'

export interface UpdatePrivacyInput {
  showPhone?: boolean
  showEmail?: boolean
  showCity?: boolean
  showMedical?: boolean
  showVeterinarian?: boolean
  showBehavior?: boolean
  showContacts?: boolean
}

/**
 * Caso de uso: atualizar as configurações de privacidade do próprio pet.
 */
@Injectable()
export class UpdatePrivacyUseCase {
  constructor(
    @Inject(PET_REPOSITORY_PORT) private readonly pets: PetRepositoryPort,
    @Inject(AUDIT_LOGGER_PORT) private readonly audit: AuditLoggerPort,
    @Inject(PUBLIC_PROFILE_INVALIDATION_PORT)
    private readonly invalidation: PublicProfileInvalidationPort,
  ) {}

  async execute(
    actorId: string,
    petId: string,
    input: UpdatePrivacyInput,
  ): Promise<Pet> {
    const pet = await this.pets.findById(petId)
    if (!pet) {
      throw new PetNotFoundError(petId)
    }
    PetOwnership.assertOwner(pet, actorId)

    pet.updatePrivacy(input)
    await this.pets.save(pet)
    await this.invalidation.invalidateByPetId(petId)

    await this.audit.log({
      action: 'privacy_change',
      entity: 'pet',
      entityId: petId,
    })

    return pet
  }
}
