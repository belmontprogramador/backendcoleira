import { Inject, Injectable } from '@nestjs/common'
import { NFC_TAG_REPOSITORY_PORT } from '../../domain/repositories/nfc-tag.repository.port'
import type { NfcTagRepositoryPort } from '../../domain/repositories/nfc-tag.repository.port'
import { AUDIT_LOGGER_PORT } from '../../../../common/ports/audit-logger.port'
import type { AuditLoggerPort } from '../../../../common/ports/audit-logger.port'
import type { NfcTag } from '../../domain/entities/nfc-tag.entity'
import { TagNotFoundError } from '../errors'

/**
 * Caso de uso: resetar a gravação de um pingente (READY → CREATED, limpa uid).
 * Mantém publicId + código (identidade preservada) — permite treinar N vezes
 * com o mesmo card. Permissão `tag:record` (OPERATOR) na rota.
 */
@Injectable()
export class ResetTagUseCase {
  constructor(
    @Inject(NFC_TAG_REPOSITORY_PORT)
    private readonly tags: NfcTagRepositoryPort,
    @Inject(AUDIT_LOGGER_PORT) private readonly audit: AuditLoggerPort,
  ) {}

  async execute(operatorId: string, publicId: string): Promise<NfcTag> {
    const tag = await this.tags.findByPublicId(publicId)
    if (!tag) {
      throw new TagNotFoundError(publicId)
    }

    tag.reset()
    await this.tags.save(tag)

    await this.audit.log({
      action: 'tag_reset',
      entity: 'nfc_tag',
      entityId: tag.id,
      metadata: { publicId, operatorId },
    })

    return tag
  }
}
