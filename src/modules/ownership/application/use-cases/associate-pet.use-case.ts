import { Inject, Injectable } from '@nestjs/common'
import { NFC_TAG_REPOSITORY_PORT } from '../../../nfc/domain/repositories/nfc-tag.repository.port'
import type { NfcTagRepositoryPort } from '../../../nfc/domain/repositories/nfc-tag.repository.port'
import { PET_REPOSITORY_PORT } from '../../../pets/domain/repositories/pet.repository.port'
import type { PetRepositoryPort } from '../../../pets/domain/repositories/pet.repository.port'
import { AUDIT_LOGGER_PORT } from '../../../../common/ports/audit-logger.port'
import type { AuditLoggerPort } from '../../../../common/ports/audit-logger.port'
import { PUBLIC_PROFILE_INVALIDATION_PORT } from '../../../../common/ports/public-profile-invalidation.port'
import type { PublicProfileInvalidationPort } from '../../../../common/ports/public-profile-invalidation.port'
import type { NfcTag } from '../../../nfc/domain/entities/nfc-tag.entity'
import { TagStatus } from '../../../nfc/domain/entities/nfc-tag.entity'
import {
  TagNotFoundError,
  PetNotFoundError,
  TagAlreadyAssociatedError,
  TagNotActiveError,
} from '../errors'
import { TagOwnership } from '../policies/tag-ownership.policy'
import { PetOwnership } from '../../../pets/application/policies/pet-ownership.policy'

/**
 * Caso de uso: associar um pet a um pingente ativo (ownership/anti-IDOR).
 * - Tag deve pertencer ao usuário e estar ACTIVE.
 * - Pet deve pertencer ao usuário.
 * - Tag não pode já ter outro pet; pet não pode já estar em outra tag.
 */
@Injectable()
export class AssociatePetUseCase {
  constructor(
    @Inject(NFC_TAG_REPOSITORY_PORT)
    private readonly tags: NfcTagRepositoryPort,
    @Inject(PET_REPOSITORY_PORT) private readonly pets: PetRepositoryPort,
    @Inject(AUDIT_LOGGER_PORT) private readonly audit: AuditLoggerPort,
    @Inject(PUBLIC_PROFILE_INVALIDATION_PORT)
    private readonly invalidation: PublicProfileInvalidationPort,
  ) {}

  async execute(userId: string, tagId: string, petId: string): Promise<NfcTag> {
    const tag = await this.tags.findById(tagId)
    if (!tag) {
      throw new TagNotFoundError(tagId)
    }
    TagOwnership.assertOwner(tag, userId)
    if (tag.status !== TagStatus.ACTIVE) {
      throw new TagNotActiveError(tag.publicId.value)
    }
    if (tag.petId !== null) {
      throw new TagAlreadyAssociatedError()
    }

    const pet = await this.pets.findById(petId)
    if (!pet) {
      throw new PetNotFoundError(petId)
    }
    PetOwnership.assertOwner(pet, userId)

    tag.associatePet(petId)
    await this.tags.save(tag)
    await this.invalidation.invalidateByPublicId(tag.publicId.value)

    await this.audit.log({
      userId,
      action: 'tag_associate_pet',
      entity: 'nfc_tag',
      entityId: tag.id,
      metadata: { petId },
    })

    return tag
  }
}
