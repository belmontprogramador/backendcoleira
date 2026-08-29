import { Inject, Injectable } from '@nestjs/common'
import { NFC_TAG_REPOSITORY_PORT } from '../../../nfc/domain/repositories/nfc-tag.repository.port'
import type { NfcTagRepositoryPort } from '../../../nfc/domain/repositories/nfc-tag.repository.port'
import { ACTIVATION_CODE_CIPHER_PORT } from '../../../nfc/domain/services/activation-code-cipher.port'
import type { ActivationCodeCipherPort } from '../../../nfc/domain/services/activation-code-cipher.port'
import { AUDIT_LOGGER_PORT } from '../../../../common/ports/audit-logger.port'
import type { AuditLoggerPort } from '../../../../common/ports/audit-logger.port'
import { PUBLIC_PROFILE_INVALIDATION_PORT } from '../../../../common/ports/public-profile-invalidation.port'
import type { PublicProfileInvalidationPort } from '../../../../common/ports/public-profile-invalidation.port'
import type { NfcTag } from '../../../nfc/domain/entities/nfc-tag.entity'
import {
  TagNotFoundError,
  ActivationCodeMismatchError,
  TagAlreadyActivatedError,
} from '../errors'

/**
 * Caso de uso: ativar um pingente virgem (Fase 4 — o coração do sistema).
 *
 * - Public ID NÃO é credencial; só o código de ativação (single-use) autoriza.
 * - Aceita status AVAILABLE ou DELIVERED (transição automática).
 * - Descriptografa o `activationCodeEncrypted` (AES-256-GCM) e compara com o
 *   código digitado (normalizado para maiúsculas).
 */
@Injectable()
export class ActivateTagUseCase {
  constructor(
    @Inject(NFC_TAG_REPOSITORY_PORT)
    private readonly tags: NfcTagRepositoryPort,
    @Inject(ACTIVATION_CODE_CIPHER_PORT)
    private readonly cipher: ActivationCodeCipherPort,
    @Inject(AUDIT_LOGGER_PORT) private readonly audit: AuditLoggerPort,
    @Inject(PUBLIC_PROFILE_INVALIDATION_PORT)
    private readonly invalidation: PublicProfileInvalidationPort,
  ) {}

  async execute(
    userId: string,
    publicId: string,
    activationCode: string,
  ): Promise<NfcTag> {
    const tag = await this.tags.findByPublicId(publicId)
    if (!tag) {
      throw new TagNotFoundError(publicId)
    }

    if (tag.ownerId !== null) {
      throw new TagAlreadyActivatedError(publicId)
    }

    const decrypted = this.cipher.decrypt(tag.activationCodeEncrypted)
    if (decrypted !== activationCode.toUpperCase()) {
      await this.audit.log({
        userId,
        action: 'tag_activate_failed',
        entity: 'nfc_tag',
        entityId: tag.id,
        metadata: { publicId },
      })
      throw new ActivationCodeMismatchError()
    }

    tag.activate(userId)
    await this.tags.save(tag)
    await this.invalidation.invalidateByPublicId(tag.publicId.value)

    await this.audit.log({
      userId,
      action: 'tag_activate',
      entity: 'nfc_tag',
      entityId: tag.id,
      metadata: { publicId },
    })

    return tag
  }
}
