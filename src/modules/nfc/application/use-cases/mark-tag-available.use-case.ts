import { Inject, Injectable } from '@nestjs/common'
import { NFC_TAG_REPOSITORY_PORT } from '../../domain/repositories/nfc-tag.repository.port'
import type { NfcTagRepositoryPort } from '../../domain/repositories/nfc-tag.repository.port'
import { AUDIT_LOGGER_PORT } from '../../../../common/ports/audit-logger.port'
import type { AuditLoggerPort } from '../../../../common/ports/audit-logger.port'
import type { NfcTag } from '../../domain/entities/nfc-tag.entity'
import { TagNotFoundError } from '../errors'

/**
 * Caso de uso: marca um pingente como AVAILABLE (pronto para ativação do
 * cliente). Atalho da Opção A — READY → AVAILABLE direto, pulando o rastreio
 * físico (IN_STOCK/SOLD/DELIVERED) quando o chip vai direto ao cliente.
 *
 * Permissão `tag:write` na rota (ADMIN/OPERATOR). Idempotente: a entidade
 * `markAvailable()` é no-op quando já AVAILABLE.
 */
@Injectable()
export class MarkTagAvailableUseCase {
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

    const previousStatus = tag.status
    tag.markAvailable()
    await this.tags.save(tag)

    await this.audit.log({
      action: 'tag_mark_available',
      entity: 'nfc_tag',
      entityId: tag.id,
      metadata: { publicId, operatorId, previousStatus },
    })

    return tag
  }
}
