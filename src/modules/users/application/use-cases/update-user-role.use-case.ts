import { Inject, Injectable } from '@nestjs/common'
import { USER_REPOSITORY_PORT } from '../../domain/repositories/user.repository.port'
import type { UserRepositoryPort } from '../../domain/repositories/user.repository.port'
import { USER_ACCESS_PORT } from '../../../../common/ports/user-access.port'
import type { UserAccessPort } from '../../../../common/ports/user-access.port'
import { ROLE_REPOSITORY_PORT } from '../../domain/repositories/role.repository.port'
import type { RoleRepositoryPort } from '../../domain/repositories/role.repository.port'
import { AUDIT_LOGGER_PORT } from '../../../../common/ports/audit-logger.port'
import type { AuditLoggerPort } from '../../../../common/ports/audit-logger.port'
import { canManage } from '../../../../common/constants/roles'
import {
  HierarchyViolationError,
  RoleNotFoundError,
  UserNotFoundError,
} from '../errors'

/**
 * Caso de uso: definir a role de um usuário (SUPER_ADMIN).
 *
 * Regras:
 * - Aplica hierarquia: o ator só gerencia alvo de role estritamente inferior.
 * - SUBSTITUI todas as roles do alvo (um usuário = uma role).
 * - NUNCA define SUPER_ADMIN (um user nunca vira super admin por promoção).
 * - Registra auditoria da mudança.
 */
@Injectable()
export class UpdateUserRoleUseCase {
  constructor(
    @Inject(USER_REPOSITORY_PORT) private readonly users: UserRepositoryPort,
    @Inject(USER_ACCESS_PORT) private readonly access: UserAccessPort,
    @Inject(ROLE_REPOSITORY_PORT) private readonly roles: RoleRepositoryPort,
    @Inject(AUDIT_LOGGER_PORT) private readonly audit: AuditLoggerPort,
  ) {}

  async execute(
    actorRoles: string[],
    targetId: string,
    roleName: string,
  ): Promise<void> {
    if (roleName === 'SUPER_ADMIN') {
      throw new HierarchyViolationError()
    }

    const user = await this.users.findById(targetId)
    if (!user) {
      throw new UserNotFoundError(targetId)
    }

    const targetAccess = await this.access.resolveAccess(targetId)
    const targetRoles = targetAccess?.roles ?? []

    if (!canManage(actorRoles, targetRoles)) {
      throw new HierarchyViolationError()
    }

    const role = await this.roles.findByName(roleName)
    if (!role) {
      throw new RoleNotFoundError(roleName)
    }

    await this.roles.setRole(targetId, role.id)
    await this.audit.log({
      action: 'role_change',
      entity: 'user',
      entityId: targetId,
      metadata: { role: roleName },
    })
  }
}
