import { Inject, Injectable } from '@nestjs/common'
import { PET_REPOSITORY_PORT } from '../../../pets/domain/repositories/pet.repository.port'
import type { PetRepositoryPort } from '../../../pets/domain/repositories/pet.repository.port'
import { PetNotFoundError } from '../../../pets/application/errors'
import { PetOwnership } from '../../../pets/application/policies/pet-ownership.policy'
import { FEATURE_ACCESS_PORT } from '../../../../common/ports/feature-access.port'
import type { FeatureAccessPort } from '../../../../common/ports/feature-access.port'
import { FeatureNotAvailableError } from '../../../../common/errors/feature-not-available.error'
import { ACCESS_EVENT_REPOSITORY_PORT } from '../../domain/repositories/access-event.repository.port'
import type { AccessEventRepositoryPort } from '../../domain/repositories/access-event.repository.port'
import type { AccessEvent } from '../../domain/entities/access-event.entity'

const ACCESS_HISTORY_FEATURE = 'ACCESS_HISTORY'

/**
 * Caso de uso: listar histórico de acessos do pet (feature Premium
 * `ACCESS_HISTORY`). Valida ownership (anti-IDOR) e a feature no use case (D6).
 */
@Injectable()
export class ListAccessEventsUseCase {
  constructor(
    @Inject(PET_REPOSITORY_PORT)
    private readonly pets: PetRepositoryPort,
    @Inject(FEATURE_ACCESS_PORT)
    private readonly featureAccess: FeatureAccessPort,
    @Inject(ACCESS_EVENT_REPOSITORY_PORT)
    private readonly events: AccessEventRepositoryPort,
  ) {}

  async execute(actorId: string, petId: string): Promise<AccessEvent[]> {
    const pet = await this.pets.findById(petId)
    if (!pet) throw new PetNotFoundError(petId)
    PetOwnership.assertOwner(pet, actorId)

    const has = await this.featureAccess.hasFeature(
      actorId,
      ACCESS_HISTORY_FEATURE,
    )
    if (!has) throw new FeatureNotAvailableError(ACCESS_HISTORY_FEATURE)

    return this.events.listByPet(petId)
  }
}
