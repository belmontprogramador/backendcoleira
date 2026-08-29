import { Inject, Injectable } from '@nestjs/common'
import { NFC_TAG_REPOSITORY_PORT } from '../../../nfc/domain/repositories/nfc-tag.repository.port'
import type { NfcTagRepositoryPort } from '../../../nfc/domain/repositories/nfc-tag.repository.port'
import { AUDIT_LOGGER_PORT } from '../../../../common/ports/audit-logger.port'
import type { AuditLoggerPort } from '../../../../common/ports/audit-logger.port'
import { PUBLIC_PROFILE_INVALIDATION_PORT } from '../../../../common/ports/public-profile-invalidation.port'
import type { PublicProfileInvalidationPort } from '../../../../common/ports/public-profile-invalidation.port'
import type { NfcTag } from '../../../nfc/domain/entities/nfc-tag.entity'
import { TagNotFoundError } from '../errors'
import { TagOwnership } from '../policies/tag-ownership.policy'

/**
 * Caso de uso: substituir um pingente (hardware quebrou).
 *
 * Regra do doc-sistema §substituição §10: o PET permanece o mesmo, o perfil
 * permanece, a assinatura permanece. Só o hardware muda.
 *
 * NÃO copia dados (privacy/medical/contacts) — esses vivem no Pet, não na tag.
 * A nova tag apenas aponta para o mesmo pet.
 */
@Injectable()
export class ReplaceTagUseCase {
  constructor(
    @Inject(NFC_TAG_REPOSITORY_PORT)
    private readonly tags: NfcTagRepositoryPort,
    @Inject(AUDIT_LOGGER_PORT) private readonly audit: AuditLoggerPort,
    @Inject(PUBLIC_PROFILE_INVALIDATION_PORT)
    private readonly invalidation: PublicProfileInvalidationPort,
  ) {}

  async execute(
    userId: string,
    oldTagId: string,
    newTagId: string,
  ): Promise<NfcTag> {
    const oldTag = await this.tags.findById(oldTagId)
    if (!oldTag) {
      throw new TagNotFoundError(oldTagId)
    }
    TagOwnership.assertOwner(oldTag, userId)

    const newTag = await this.tags.findById(newTagId)
    if (!newTag) {
      throw new TagNotFoundError(newTagId)
    }

    const petId = oldTag.petId

    // old tag aposentada, ownership limpo.
    oldTag.retire()
    await this.tags.save(oldTag)

    // new tag assume o MESMO pet e o MESMO dono.
    newTag.activate(userId)
    if (petId) {
      newTag.associatePet(petId)
    }
    await this.tags.save(newTag)

    await this.invalidation.invalidateByPublicId(oldTag.publicId.value)
    await this.invalidation.invalidateByPublicId(newTag.publicId.value)

    await this.audit.log({
      userId,
      action: 'tag_replace',
      entity: 'nfc_tag',
      entityId: newTag.id,
      metadata: { oldTagId, petId },
    })

    return newTag
  }
}
