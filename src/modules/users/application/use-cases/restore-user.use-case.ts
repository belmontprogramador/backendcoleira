import { Inject, Injectable } from '@nestjs/common'
import { USER_REPOSITORY_PORT } from '../../domain/repositories/user.repository.port'
import type { UserRepositoryPort } from '../../domain/repositories/user.repository.port'
import { USER_ACCESS_PORT } from '../../../../common/ports/user-access.port'
import type { UserAccessPort } from '../../../../common/ports/user-access.port'
import { AUDIT_LOGGER_PORT } from '../../../../common/ports/audit-logger.port'
import type { AuditLoggerPort } from '../../../../common/ports/audit-logger.port'
import { canManage } from '../../../../common/constants/roles'
import type { User } from '../../domain/entities/user.entity'
import { HierarchyViolationError, UserNotFoundError } from '../errors'

/**
 * Caso de uso: reativar (restore) um usuário desativado (soft delete).
 * É o inverso do `AdminDeleteUserUseCase` — reverte `deactivate()`.
 * Aplica a mesma hierarquia de gerenciamento e registra auditoria.
 */
@Injectable()
export class RestoreUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY_PORT) private readonly users: UserRepositoryPort,
    @Inject(USER_ACCESS_PORT) private readonly access: UserAccessPort,
    @Inject(AUDIT_LOGGER_PORT) private readonly audit: AuditLoggerPort,
  ) {}

  async execute(actorRoles: string[], targetId: string): Promise<User> {
    const user = await this.users.findById(targetId)
    if (!user) {
      throw new UserNotFoundError(targetId)
    }

    const targetAccess = await this.access.resolveAccess(targetId)
    const targetRoles = targetAccess?.roles ?? []

    if (!canManage(actorRoles, targetRoles)) {
      throw new HierarchyViolationError()
    }

    user.restore()
    await this.users.save(user)

    await this.audit.log({
      action: 'restore',
      entity: 'user',
      entityId: targetId,
    })

    return user
  }
}
