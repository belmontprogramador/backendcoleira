import { Inject, Injectable } from '@nestjs/common'
import { USER_REPOSITORY_PORT } from '../../domain/repositories/user.repository.port'
import type { UserRepositoryPort } from '../../domain/repositories/user.repository.port'
import { USER_ACCESS_PORT } from '../../../../common/ports/user-access.port'
import type { UserAccessPort } from '../../../../common/ports/user-access.port'
import { PASSWORD_HASHER_PORT } from '../../../../common/ports/password-hasher.port'
import type { PasswordHasherPort } from '../../../../common/ports/password-hasher.port'
import { PASSWORD_GENERATOR_PORT } from '../../../../common/ports/password-generator.port'
import type { PasswordGeneratorPort } from '../../../../common/ports/password-generator.port'
import { REFRESH_TOKEN_STORE_PORT } from '../../../../common/ports/refresh-token-store.port'
import type { RefreshTokenStorePort } from '../../../../common/ports/refresh-token-store.port'
import { EMAIL_SENDER_PORT } from '../../../../common/ports/email-sender.port'
import type { EmailSenderPort } from '../../../../common/ports/email-sender.port'
import { AUDIT_LOGGER_PORT } from '../../../../common/ports/audit-logger.port'
import type { AuditLoggerPort } from '../../../../common/ports/audit-logger.port'
import { canManage } from '../../../../common/constants/roles'
import { Password } from '../../domain/value-objects/password.vo'
import {
  HierarchyViolationError,
  UserNotFoundError,
  EmailDeliveryError,
} from '../errors'

/**
 * Caso de uso: force reset de senha por um administrador.
 * O sistema gera uma nova senha, persiste o hash, revoga as sessões do alvo
 * e envia a senha em texto puro por e-mail (o admin NÃO escolhe a senha).
 * Aplica hierarquia: o ator só reseta alvo de role estritamente inferior.
 */
@Injectable()
export class AdminResetUserPasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY_PORT) private readonly users: UserRepositoryPort,
    @Inject(USER_ACCESS_PORT) private readonly access: UserAccessPort,
    @Inject(PASSWORD_HASHER_PORT) private readonly hasher: PasswordHasherPort,
    @Inject(PASSWORD_GENERATOR_PORT)
    private readonly generator: PasswordGeneratorPort,
    @Inject(REFRESH_TOKEN_STORE_PORT)
    private readonly refreshTokens: RefreshTokenStorePort,
    @Inject(EMAIL_SENDER_PORT) private readonly email: EmailSenderPort,
    @Inject(AUDIT_LOGGER_PORT) private readonly audit: AuditLoggerPort,
  ) {}

  async execute(actorRoles: string[], targetId: string): Promise<void> {
    const user = await this.users.findById(targetId)
    if (!user) {
      throw new UserNotFoundError(targetId)
    }

    const targetAccess = await this.access.resolveAccess(targetId)
    const targetRoles = targetAccess?.roles ?? []

    if (!canManage(actorRoles, targetRoles)) {
      throw new HierarchyViolationError()
    }

    const newPassword = this.generator.generate()
    const password = Password.create(newPassword)
    const hash = await this.hasher.hash(password.value)

    // Envia o e-mail ANTES de persistir: se o envio falhar, a senha NÃO é
    // alterada (evita deixar o usuário sem acesso). A falha vira erro claro.
    try {
      await this.email.sendAdminPasswordResetEmail(
        user.email.value,
        newPassword,
      )
    } catch {
      throw new EmailDeliveryError(
        'Não foi possível enviar a nova senha por e-mail. A senha não foi alterada.',
      )
    }

    user.changePassword(hash)
    await this.users.save(user)

    // Revoga todas as sessões do alvo (força re-login com a nova senha).
    await this.refreshTokens.revokeAllForUser(targetId)

    await this.audit.log({
      action: 'password_reset_by_admin',
      entity: 'user',
      entityId: targetId,
    })
  }
}
