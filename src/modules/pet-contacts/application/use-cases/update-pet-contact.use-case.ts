import { Inject, Injectable } from '@nestjs/common'
import { PET_REPOSITORY_PORT } from '../../../pets/domain/repositories/pet.repository.port'
import type { PetRepositoryPort } from '../../../pets/domain/repositories/pet.repository.port'
import { PetNotFoundError } from '../../../pets/application/errors'
import { PetOwnership } from '../../../pets/application/policies/pet-ownership.policy'
import { FEATURE_ACCESS_PORT } from '../../../../common/ports/feature-access.port'
import type { FeatureAccessPort } from '../../../../common/ports/feature-access.port'
import { FeatureNotAvailableError } from '../../../../common/errors/feature-not-available.error'
import { PET_CONTACT_REPOSITORY_PORT } from '../../domain/repositories/pet-contact.repository.port'
import type { PetContactRepositoryPort } from '../../domain/repositories/pet-contact.repository.port'
import { PetContactNotFoundError } from '../errors'
import type { PetContact } from '../../domain/entities/pet-contact.entity'
import type { UpdatePetContactData } from '../../domain/entities/pet-contact.entity'

const MULTIPLE_CONTACTS_FEATURE = 'MULTIPLE_CONTACTS'

/**
 * Caso de uso: atualizar contato do pet (feature Premium `MULTIPLE_CONTACTS`).
 * Anti-IDOR: o contato precisa pertencer ao pet indicado na rota.
 */
@Injectable()
export class UpdatePetContactUseCase {
  constructor(
    @Inject(PET_REPOSITORY_PORT)
    private readonly pets: PetRepositoryPort,
    @Inject(FEATURE_ACCESS_PORT)
    private readonly featureAccess: FeatureAccessPort,
    @Inject(PET_CONTACT_REPOSITORY_PORT)
    private readonly contacts: PetContactRepositoryPort,
  ) {}

  async execute(
    actorId: string,
    petId: string,
    contactId: string,
    data: UpdatePetContactData,
  ): Promise<PetContact> {
    const pet = await this.pets.findById(petId)
    if (!pet) throw new PetNotFoundError(petId)
    PetOwnership.assertOwner(pet, actorId)

    const has = await this.featureAccess.hasFeature(
      actorId,
      MULTIPLE_CONTACTS_FEATURE,
    )
    if (!has) throw new FeatureNotAvailableError(MULTIPLE_CONTACTS_FEATURE)

    const contact = await this.contacts.findById(contactId)
    if (!contact || contact.petId !== petId) {
      throw new PetContactNotFoundError(contactId)
    }

    contact.update(data)
    await this.contacts.save(contact)
    return contact
  }
}
