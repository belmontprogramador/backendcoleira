import { Inject, Injectable } from '@nestjs/common'
import { PASSWORD_HASHER_PORT } from '../../../../common/ports/password-hasher.port'
import type { PasswordHasherPort } from '../../../../common/ports/password-hasher.port'
import { USER_REPOSITORY_PORT } from '../../domain/repositories/user.repository.port'
import type { UserRepositoryPort } from '../../domain/repositories/user.repository.port'
import { Password } from '../../domain/value-objects/password.vo'
import { IncorrectPasswordError, UserNotFoundError } from '../errors'

/**
 * Caso de uso: alterar a própria senha (exige a senha atual).
 */
@Injectable()
export class ChangePasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY_PORT) private readonly users: UserRepositoryPort,
    @Inject(PASSWORD_HASHER_PORT) private readonly hasher: PasswordHasherPort,
  ) {}

  async execute(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.users.findById(userId)
    if (!user) {
      throw new UserNotFoundError(userId)
    }

    const matches = await this.hasher.compare(
      currentPassword,
      user.passwordHash,
    )
    if (!matches) {
      throw new IncorrectPasswordError()
    }

    const password = Password.create(newPassword)
    const newHash = await this.hasher.hash(password.value)

    user.changePassword(newHash)
    await this.users.save(user)
  }
}
