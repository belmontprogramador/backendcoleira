import { Inject, Injectable } from '@nestjs/common'
import { NFC_TAG_REPOSITORY_PORT } from '../../../nfc/domain/repositories/nfc-tag.repository.port'
import type { NfcTagRepositoryPort } from '../../../nfc/domain/repositories/nfc-tag.repository.port'
import { AUDIT_LOGGER_PORT } from '../../../../common/ports/audit-logger.port'
import type { AuditLoggerPort } from '../../../../common/ports/audit-logger.port'
import { PUBLIC_PROFILE_INVALIDATION_PORT } from '../../../../common/ports/public-profile-invalidation.port'
import type { PublicProfileInvalidationPort } from '../../../../common/ports/public-profile-invalidation.port'
import type { NfcTag } from '../../../nfc/domain/entities/nfc-tag.entity'
import { TagStatus } from '../../../nfc/domain/entities/nfc-tag.entity'
import {
  TagNotFoundError,
  NoPetAssociatedError,
  TagNotActiveError,
} from '../errors'
import { TagOwnership } from '../policies/tag-ownership.policy'

/**
 * Caso de uso: desassociar o pet de um pingente ativo (ownership/anti-IDOR).
 */
@Injectable()
export class DisassociatePetUseCase {
  constructor(
    @Inject(NFC_TAG_REPOSITORY_PORT)
    private readonly tags: NfcTagRepositoryPort,
    @Inject(AUDIT_LOGGER_PORT) private readonly audit: AuditLoggerPort,
    @Inject(PUBLIC_PROFILE_INVALIDATION_PORT)
    private readonly invalidation: PublicProfileInvalidationPort,
  ) {}

  async execute(userId: string, tagId: string): Promise<NfcTag> {
    const tag = await this.tags.findById(tagId)
    if (!tag) {
      throw new TagNotFoundError(tagId)
    }
    TagOwnership.assertOwner(tag, userId)
    if (tag.status !== TagStatus.ACTIVE) {
      throw new TagNotActiveError(tag.publicId.value)
    }
    if (tag.petId === null) {
      throw new NoPetAssociatedError()
    }

    tag.disassociatePet()
    await this.tags.save(tag)
    await this.invalidation.invalidateByPublicId(tag.publicId.value)

    await this.audit.log({
      userId,
      action: 'tag_disassociate_pet',
      entity: 'nfc_tag',
      entityId: tag.id,
    })

    return tag
  }
}
