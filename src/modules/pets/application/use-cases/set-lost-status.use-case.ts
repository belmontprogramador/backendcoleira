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

/**
 * Caso de uso: marcar/desmarcar pet como perdido (modo perdido).
 */
@Injectable()
export class SetLostStatusUseCase {
  constructor(
    @Inject(PET_REPOSITORY_PORT) private readonly pets: PetRepositoryPort,
    @Inject(AUDIT_LOGGER_PORT) private readonly audit: AuditLoggerPort,
    @Inject(PUBLIC_PROFILE_INVALIDATION_PORT)
    private readonly invalidation: PublicProfileInvalidationPort,
  ) {}

  async execute(actorId: string, petId: string, lost: boolean): Promise<Pet> {
    const pet = await this.pets.findById(petId)
    if (!pet) {
      throw new PetNotFoundError(petId)
    }
    PetOwnership.assertOwner(pet, actorId)

    if (lost) {
      pet.markLost()
    } else {
      pet.markFound()
    }
    await this.pets.save(pet)
    await this.invalidation.invalidateByPetId(petId)

    await this.audit.log({
      action: 'lost_status',
      entity: 'pet',
      entityId: petId,
      metadata: { lost },
    })

    return pet
  }
}
