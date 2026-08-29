import { Inject, Injectable } from '@nestjs/common'
import { NFC_TAG_REPOSITORY_PORT } from '../../domain/repositories/nfc-tag.repository.port'
import type { NfcTagRepositoryPort } from '../../domain/repositories/nfc-tag.repository.port'
import { ACTIVATION_CODE_CIPHER_PORT } from '../../domain/services/activation-code-cipher.port'
import type { ActivationCodeCipherPort } from '../../domain/services/activation-code-cipher.port'
import { AUDIT_LOGGER_PORT } from '../../../../common/ports/audit-logger.port'
import type { AuditLoggerPort } from '../../../../common/ports/audit-logger.port'
import { TagNotFoundError } from '../errors'

export interface ReprintCodeResult {
  publicId: string
  code: string
}

/**
 * Caso de uso: reimprimir o cartão — devolve o código de ativação em texto
 * puro (descriptografado sob demanda). Permissão `tag:write` (OPERATOR, ADMIN).
 */
@Injectable()
export class ReprintCodeUseCase {
  constructor(
    @Inject(NFC_TAG_REPOSITORY_PORT)
    private readonly tags: NfcTagRepositoryPort,
    @Inject(ACTIVATION_CODE_CIPHER_PORT)
    private readonly cipher: ActivationCodeCipherPort,
    @Inject(AUDIT_LOGGER_PORT) private readonly audit: AuditLoggerPort,
  ) {}

  async execute(
    operatorId: string,
    publicId: string,
  ): Promise<ReprintCodeResult> {
    const tag = await this.tags.findByPublicId(publicId)
    if (!tag) {
      throw new TagNotFoundError(publicId)
    }

    const code = this.cipher.decrypt(tag.activationCodeEncrypted)

    await this.audit.log({
      action: 'tag_reprint',
      entity: 'nfc_tag',
      entityId: tag.id,
      metadata: { publicId, operatorId },
    })

    return { publicId, code }
  }
}
