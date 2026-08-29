import { Inject, Injectable } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { NFC_TAG_REPOSITORY_PORT } from '../../../nfc/domain/repositories/nfc-tag.repository.port'
import type { NfcTagRepositoryPort } from '../../../nfc/domain/repositories/nfc-tag.repository.port'
import { USER_REPOSITORY_PORT } from '../../../users/domain/repositories/user.repository.port'
import type { UserRepositoryPort } from '../../../users/domain/repositories/user.repository.port'
import { TEMPORARY_TOKEN_STORE_PORT } from '../../../../common/ports/temporary-token-store.port'
import type { TemporaryTokenStorePort } from '../../../../common/ports/temporary-token-store.port'
import { EMAIL_SENDER_PORT } from '../../../../common/ports/email-sender.port'
import type { EmailSenderPort } from '../../../../common/ports/email-sender.port'
import { AUDIT_LOGGER_PORT } from '../../../../common/ports/audit-logger.port'
import type { AuditLoggerPort } from '../../../../common/ports/audit-logger.port'
import {
  TagNotFoundError,
  UserNotFoundError,
  TransferToSelfError,
} from '../errors'
import { TagOwnership } from '../policies/tag-ownership.policy'

const TRANSFER_TTL_SECONDS = 7 * 24 * 3600 // 7 dias

export interface RequestTransferResult {
  token: string
}

/**
 * Caso de uso: solicitar transferência de um pingente (dono → destinatário).
 * Gera token temporário (Redis, TTL 7d) e envia email ao destinatário.
 */
@Injectable()
export class RequestTransferUseCase {
  constructor(
    @Inject(NFC_TAG_REPOSITORY_PORT)
    private readonly tags: NfcTagRepositoryPort,
    @Inject(USER_REPOSITORY_PORT) private readonly users: UserRepositoryPort,
    @Inject(TEMPORARY_TOKEN_STORE_PORT)
    private readonly tokens: TemporaryTokenStorePort,
    @Inject(EMAIL_SENDER_PORT) private readonly email: EmailSenderPort,
    @Inject(AUDIT_LOGGER_PORT) private readonly audit: AuditLoggerPort,
  ) {}

  async execute(
    userId: string,
    tagId: string,
    toEmail: string,
  ): Promise<RequestTransferResult> {
    const tag = await this.tags.findById(tagId)
    if (!tag) {
      throw new TagNotFoundError(tagId)
    }
    TagOwnership.assertOwner(tag, userId)

    const recipient = await this.users.findByEmail(toEmail)
    if (!recipient) {
      throw new UserNotFoundError(toEmail)
    }
    if (recipient.id === userId) {
      throw new TransferToSelfError()
    }

    const token = randomUUID()
    const payload = JSON.stringify({ tagId: tag.id, toUserId: recipient.id })
    await this.tokens.save(`transfer:${token}`, payload, TRANSFER_TTL_SECONDS)
    await this.email.sendTransferEmail(toEmail, token)

    await this.audit.log({
      userId,
      action: 'tag_transfer_requested',
      entity: 'nfc_tag',
      entityId: tag.id,
      metadata: { toEmail },
    })

    return { token }
  }
}
