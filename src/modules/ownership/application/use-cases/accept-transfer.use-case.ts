import { Inject, Injectable } from '@nestjs/common'
import { NFC_TAG_REPOSITORY_PORT } from '../../../nfc/domain/repositories/nfc-tag.repository.port'
import type { NfcTagRepositoryPort } from '../../../nfc/domain/repositories/nfc-tag.repository.port'
import { USER_REPOSITORY_PORT } from '../../../users/domain/repositories/user.repository.port'
import type { UserRepositoryPort } from '../../../users/domain/repositories/user.repository.port'
import { TEMPORARY_TOKEN_STORE_PORT } from '../../../../common/ports/temporary-token-store.port'
import type { TemporaryTokenStorePort } from '../../../../common/ports/temporary-token-store.port'
import { AUDIT_LOGGER_PORT } from '../../../../common/ports/audit-logger.port'
import type { AuditLoggerPort } from '../../../../common/ports/audit-logger.port'
import { PUBLIC_PROFILE_INVALIDATION_PORT } from '../../../../common/ports/public-profile-invalidation.port'
import type { PublicProfileInvalidationPort } from '../../../../common/ports/public-profile-invalidation.port'
import type { NfcTag } from '../../../nfc/domain/entities/nfc-tag.entity'
import {
  TagNotFoundError,
  TransferTokenInvalidError,
  TransferUserMismatchError,
} from '../errors'

interface TransferPayload {
  tagId: string
  toUserId: string
}

/**
 * Caso de uso: aceitar uma transferência de pingente (destinatário).
 * Consome o token (single-use) e transfere o ownership, mantendo o pet.
 */
@Injectable()
export class AcceptTransferUseCase {
  constructor(
    @Inject(NFC_TAG_REPOSITORY_PORT)
    private readonly tags: NfcTagRepositoryPort,
    @Inject(USER_REPOSITORY_PORT) private readonly users: UserRepositoryPort,
    @Inject(TEMPORARY_TOKEN_STORE_PORT)
    private readonly tokens: TemporaryTokenStorePort,
    @Inject(AUDIT_LOGGER_PORT) private readonly audit: AuditLoggerPort,
    @Inject(PUBLIC_PROFILE_INVALIDATION_PORT)
    private readonly invalidation: PublicProfileInvalidationPort,
  ) {}

  async execute(userId: string, token: string): Promise<NfcTag> {
    const raw = await this.tokens.consume(`transfer:${token}`)
    if (!raw) {
      throw new TransferTokenInvalidError()
    }

    let payload: TransferPayload
    try {
      payload = JSON.parse(raw) as TransferPayload
    } catch {
      throw new TransferTokenInvalidError()
    }

    if (payload.toUserId !== userId) {
      throw new TransferUserMismatchError()
    }

    const tag = await this.tags.findById(payload.tagId)
    if (!tag) {
      throw new TagNotFoundError(payload.tagId)
    }

    // Mantém o pet (se houver); apenas troca o dono.
    const petId = tag.petId
    tag.unlink()
    tag.activate(userId)
    if (petId) {
      tag.associatePet(petId)
    }
    await this.tags.save(tag)
    await this.invalidation.invalidateByPublicId(tag.publicId.value)

    await this.audit.log({
      userId,
      action: 'tag_transfer',
      entity: 'nfc_tag',
      entityId: tag.id,
    })

    return tag
  }
}
