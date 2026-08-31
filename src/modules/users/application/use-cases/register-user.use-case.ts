import { Inject, Injectable } from '@nestjs/common'
import { randomBytes, randomUUID } from 'node:crypto'
import { PASSWORD_HASHER_PORT } from '../../../../common/ports/password-hasher.port'
import type { PasswordHasherPort } from '../../../../common/ports/password-hasher.port'
import { TEMPORARY_TOKEN_STORE_PORT } from '../../../../common/ports/temporary-token-store.port'
import type { TemporaryTokenStorePort } from '../../../../common/ports/temporary-token-store.port'
import { EMAIL_SENDER_PORT } from '../../../../common/ports/email-sender.port'
import type { EmailSenderPort } from '../../../../common/ports/email-sender.port'
import { USER_REPOSITORY_PORT } from '../../domain/repositories/user.repository.port'
import type { UserRepositoryPort } from '../../domain/repositories/user.repository.port'
import { ROLE_REPOSITORY_PORT } from '../../domain/repositories/role.repository.port'
import type { RoleRepositoryPort } from '../../domain/repositories/role.repository.port'
import { Role } from '../../../../common/constants/roles'
import { Email } from '../../domain/value-objects/email.vo'
import { Password } from '../../domain/value-objects/password.vo'
import { User } from '../../domain/entities/user.entity'
import { EmailAlreadyInUseError, RoleNotFoundError } from '../errors'

const VERIFY_TTL_SECONDS = 86400 // 24 horas

export interface RegisterUserInput {
  name: string
  email: string
  password: string
  phone?: string
}

export interface RegisterUserResult {
  id: string
}

/**
 * Caso de uso: registrar um novo usuário (cliente final).
 * Cria a conta (PENDING_VERIFICATION), atribui a role `USER`, gera o token de
 * verificação de e-mail e dispara o envio.
 */
@Injectable()
export class RegisterUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY_PORT) private readonly users: UserRepositoryPort,
    @Inject(ROLE_REPOSITORY_PORT) private readonly roles: RoleRepositoryPort,
    @Inject(PASSWORD_HASHER_PORT) private readonly hasher: PasswordHasherPort,
    @Inject(TEMPORARY_TOKEN_STORE_PORT)
    private readonly tokens: TemporaryTokenStorePort,
    @Inject(EMAIL_SENDER_PORT) private readonly email: EmailSenderPort,
  ) {}

  async execute(input: RegisterUserInput): Promise<RegisterUserResult> {
    const email = Email.create(input.email)
    const password = Password.create(input.password)

    const existing = await this.users.findByEmail(email.value)
    if (existing) {
      throw new EmailAlreadyInUseError(email.value)
    }

    const passwordHash = await this.hasher.hash(password.value)

    const user = User.create({
      id: randomUUID(),
      name: input.name,
      email,
      passwordHash,
      phone: input.phone ?? null,
    })

    await this.users.save(user)

    const userRole = await this.roles.findByName(Role.USER)
    if (!userRole) {
      throw new RoleNotFoundError(Role.USER)
    }
    await this.roles.setRole(user.id, userRole.id)

    const verifyToken = randomBytes(32).toString('hex')
    await this.tokens.save(`verify:${verifyToken}`, user.id, VERIFY_TTL_SECONDS)
    await this.email.sendVerificationEmail(email.value, verifyToken)

    return { id: user.id }
  }
}
