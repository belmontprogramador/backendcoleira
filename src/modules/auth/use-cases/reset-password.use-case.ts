import { Inject, Injectable } from '@nestjs/common'
import { USER_REPOSITORY_PORT } from '../../users/domain/repositories/user.repository.port'
import type { UserRepositoryPort } from '../../users/domain/repositories/user.repository.port'
import { PASSWORD_HASHER_PORT } from '../../../common/ports/password-hasher.port'
import type { PasswordHasherPort } from '../../../common/ports/password-hasher.port'
import { TEMPORARY_TOKEN_STORE_PORT } from '../../../common/ports/temporary-token-store.port'
import type { TemporaryTokenStorePort } from '../../../common/ports/temporary-token-store.port'
import { Password } from '../../users/domain/value-objects/password.vo'
import {
  InvalidTokenError,
  UserNotFoundError,
} from '../../users/application/errors'

/**
 * Caso de uso: resetar a senha a partir de um token de recuperação.
 */
@Injectable()
export class ResetPasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY_PORT) private readonly users: UserRepositoryPort,
    @Inject(PASSWORD_HASHER_PORT) private readonly hasher: PasswordHasherPort,
    @Inject(TEMPORARY_TOKEN_STORE_PORT)
    private readonly tokens: TemporaryTokenStorePort,
  ) {}

  async execute(token: string, newPassword: string): Promise<void> {
    const userId = await this.tokens.consume(`reset:${token}`)
    if (!userId) {
      throw new InvalidTokenError()
    }

    const user = await this.users.findById(userId)
    if (!user) {
      throw new UserNotFoundError(userId)
    }

    const password = Password.create(newPassword)
    const hash = await this.hasher.hash(password.value)

    user.changePassword(hash)
    await this.users.save(user)
  }
}
