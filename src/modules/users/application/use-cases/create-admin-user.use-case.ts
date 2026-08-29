import { Inject, Injectable } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { USER_REPOSITORY_PORT } from '../../domain/repositories/user.repository.port'
import type { UserRepositoryPort } from '../../domain/repositories/user.repository.port'
import { ROLE_REPOSITORY_PORT } from '../../domain/repositories/role.repository.port'
import type { RoleRepositoryPort } from '../../domain/repositories/role.repository.port'
import { PASSWORD_HASHER_PORT } from '../../../../common/ports/password-hasher.port'
import type { PasswordHasherPort } from '../../../../common/ports/password-hasher.port'
import { AUDIT_LOGGER_PORT } from '../../../../common/ports/audit-logger.port'
import type { AuditLoggerPort } from '../../../../common/ports/audit-logger.port'
import { Email } from '../../domain/value-objects/email.vo'
import { Password } from '../../domain/value-objects/password.vo'
import { User } from '../../domain/entities/user.entity'
import {
  EmailAlreadyInUseError,
  HierarchyViolationError,
  RoleNotFoundError,
} from '../errors'

export interface CreateAdminUserInput {
  name: string
  email: string
  password: string
  role: 'ADMIN' | 'SUPER_ADMIN'
}

export interface CreateAdminUserResult {
  id: string
}

/**
 * Caso de uso: criar um usuário administrativo (ADMIN ou SUPER_ADMIN).
 *
 * Exclusivo de SUPER_ADMIN (a rota exige permissão `user:role`; aqui também
 * validamos por defesa em profundidade). O usuário nasce ACTIVE com e-mail já
 * verificado — não passa pelo fluxo de verificação do cliente comum.
 */
@Injectable()
export class CreateAdminUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY_PORT) private readonly users: UserRepositoryPort,
    @Inject(ROLE_REPOSITORY_PORT) private readonly roles: RoleRepositoryPort,
    @Inject(PASSWORD_HASHER_PORT) private readonly hasher: PasswordHasherPort,
    @Inject(AUDIT_LOGGER_PORT) private readonly audit: AuditLoggerPort,
  ) {}

  async execute(
    actorRoles: string[],
    input: CreateAdminUserInput,
  ): Promise<CreateAdminUserResult> {
    if (!actorRoles.includes('SUPER_ADMIN')) {
      throw new HierarchyViolationError()
    }

    const email = Email.create(input.email)
    const password = Password.create(input.password)

    const existing = await this.users.findByEmail(email.value)
    if (existing) {
      throw new EmailAlreadyInUseError(email.value)
    }

    const role = await this.roles.findByName(input.role)
    if (!role) {
      throw new RoleNotFoundError(input.role)
    }

    const passwordHash = await this.hasher.hash(password.value)

    const user = User.create({
      id: randomUUID(),
      name: input.name,
      email,
      passwordHash,
    })
    // Usuário administrativo nasce já verificado e ativo.
    user.verifyEmail()

    await this.users.save(user)
    await this.roles.setRole(user.id, role.id)
    await this.audit.log({
      action: 'role_change',
      entity: 'user',
      entityId: user.id,
      metadata: { role: input.role },
    })

    return { id: user.id }
  }
}
