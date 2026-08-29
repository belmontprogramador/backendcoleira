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
import { PetMedical } from '../../domain/entities/pet-medical.entity'
import type { UpdatePetMedicalData } from '../../domain/entities/pet-medical.entity'

const PET_MEDICAL_FEATURE = 'PET_MEDICAL'

/**
 * Caso de uso: criar/atualizar os dados médicos do pet (feature Premium
 * `PET_MEDICAL`). Upsert 1:1 — se não existe, cria; se existe, atualiza.
 */
@Injectable()
export class UpsertPetMedicalUseCase {
  constructor(
    @Inject(PET_REPOSITORY_PORT)
    private readonly pets: PetRepositoryPort,
    @Inject(FEATURE_ACCESS_PORT)
    private readonly featureAccess: FeatureAccessPort,
    @Inject(PET_MEDICAL_REPOSITORY_PORT)
    private readonly medical: PetMedicalRepositoryPort,
  ) {}

  async execute(
    actorId: string,
    petId: string,
    data: UpdatePetMedicalData,
  ): Promise<PetMedical> {
    const pet = await this.pets.findById(petId)
    if (!pet) throw new PetNotFoundError(petId)
    PetOwnership.assertOwner(pet, actorId)

    const has = await this.featureAccess.hasFeature(
      actorId,
      PET_MEDICAL_FEATURE,
    )
    if (!has) throw new FeatureNotAvailableError(PET_MEDICAL_FEATURE)

    const existing = await this.medical.findByPetId(petId)
    if (existing) {
      existing.update(data)
      await this.medical.save(existing)
      return existing
    }

    const medical = PetMedical.create({ petId, ...data })
    await this.medical.save(medical)
    return medical
  }
}
