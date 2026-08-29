import { Inject, Injectable } from '@nestjs/common'
import { PET_REPOSITORY_PORT } from '../../../pets/domain/repositories/pet.repository.port'
import type { PetRepositoryPort } from '../../../pets/domain/repositories/pet.repository.port'
import { PetNotFoundError } from '../../../pets/application/errors'
import { PetOwnership } from '../../../pets/application/policies/pet-ownership.policy'
import { FEATURE_ACCESS_PORT } from '../../../../common/ports/feature-access.port'
import type { FeatureAccessPort } from '../../../../common/ports/feature-access.port'
import { FeatureNotAvailableError } from '../../../../common/errors/feature-not-available.error'
import { PET_MEDICAL_REPOSITORY_PORT } from '../../domain/repositories/pet-medical.repository.port'
import type { PetMedicalRepositoryPort } from '../../domain/repositories/pet-medical.repository.port'
import type { PetMedical } from '../../domain/entities/pet-medical.entity'

const PET_MEDICAL_FEATURE = 'PET_MEDICAL'

/**
 * Caso de uso: consultar os dados médicos do pet (feature Premium `PET_MEDICAL`).
 * Valida ownership (anti-IDOR) e a feature dentro do use case (D6).
 */
@Injectable()
export class GetPetMedicalUseCase {
  constructor(
    @Inject(PET_REPOSITORY_PORT)
    private readonly pets: PetRepositoryPort,
    @Inject(FEATURE_ACCESS_PORT)
    private readonly featureAccess: FeatureAccessPort,
    @Inject(PET_MEDICAL_REPOSITORY_PORT)
    private readonly medical: PetMedicalRepositoryPort,
  ) {}

  async execute(actorId: string, petId: string): Promise<PetMedical | null> {
    const pet = await this.pets.findById(petId)
    if (!pet) throw new PetNotFoundError(petId)
    PetOwnership.assertOwner(pet, actorId)

    const has = await this.featureAccess.hasFeature(
      actorId,
      PET_MEDICAL_FEATURE,
    )
    if (!has) throw new FeatureNotAvailableError(PET_MEDICAL_FEATURE)

    return this.medical.findByPetId(petId)
  }
}
