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

export type UserStatusAction = 'BLOCKED' | 'ACTIVE'

/**
 * Caso de uso: alterar o status de um usuário (admin) — ativar ou bloquear.
 * Aplica hierarquia: o ator só gerencia alvo de role estritamente inferior.
 * Registra auditoria da mudança.
 */
@Injectable()
export class UpdateUserStatusUseCase {
  constructor(
    @Inject(USER_REPOSITORY_PORT) private readonly users: UserRepositoryPort,
    @Inject(USER_ACCESS_PORT) private readonly access: UserAccessPort,
    @Inject(AUDIT_LOGGER_PORT) private readonly audit: AuditLoggerPort,
  ) {}

  async execute(
    actorRoles: string[],
    targetId: string,
    status: UserStatusAction,
  ): Promise<User> {
    const user = await this.users.findById(targetId)
    if (!user) {
      throw new UserNotFoundError(targetId)
    }

    const targetAccess = await this.access.resolveAccess(targetId)
    const targetRoles = targetAccess?.roles ?? []

    if (!canManage(actorRoles, targetRoles)) {
      throw new HierarchyViolationError()
    }

    if (status === 'BLOCKED') {
      user.block()
    } else {
      user.activate()
    }

    await this.users.save(user)
    await this.audit.log({
      action: 'status_change',
      entity: 'user',
      entityId: targetId,
      metadata: { newStatus: status },
    })

    return user
  }
}
