import { Inject, Injectable } from '@nestjs/common'
import { USER_REPOSITORY_PORT } from '../../domain/repositories/user.repository.port'
import type { UserRepositoryPort } from '../../domain/repositories/user.repository.port'
import { USER_ACCESS_PORT } from '../../../../common/ports/user-access.port'
import type { UserAccessPort } from '../../../../common/ports/user-access.port'
import { canManage } from '../../../../common/constants/roles'
import type { User } from '../../domain/entities/user.entity'
import { HierarchyViolationError, UserNotFoundError } from '../errors'

/**
 * Caso de uso: detalhar um usuário (ADMIN/SUPER_ADMIN).
 * Aplica hierarquia: o ator só vê alvo de role estritamente inferior
 * (ou, para o próprio usuário, cai no fluxo `/users/me`).
 */
@Injectable()
export class AdminGetUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY_PORT) private readonly users: UserRepositoryPort,
    @Inject(USER_ACCESS_PORT) private readonly access: UserAccessPort,
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

    return user
  }
}
