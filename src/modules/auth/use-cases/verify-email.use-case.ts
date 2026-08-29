import { Inject, Injectable } from '@nestjs/common'
import { USER_REPOSITORY_PORT } from '../../users/domain/repositories/user.repository.port'
import type { UserRepositoryPort } from '../../users/domain/repositories/user.repository.port'
import { TEMPORARY_TOKEN_STORE_PORT } from '../../../common/ports/temporary-token-store.port'
import type { TemporaryTokenStorePort } from '../../../common/ports/temporary-token-store.port'
import {
  InvalidTokenError,
  UserNotFoundError,
} from '../../users/application/errors'

/**
 * Caso de uso: verificar o e-mail de um usuário a partir de um token.
 *
 * O token carrega o `userId` — a verificação usa esse id (nunca um email vindo
 * do corpo da requisição), garantindo que o token só verifica o usuário para
 * quem foi emitido.
 */
@Injectable()
export class VerifyEmailUseCase {
  constructor(
    @Inject(USER_REPOSITORY_PORT) private readonly users: UserRepositoryPort,
    @Inject(TEMPORARY_TOKEN_STORE_PORT)
    private readonly tokens: TemporaryTokenStorePort,
  ) {}

  async execute(token: string): Promise<void> {
    const userId = await this.tokens.consume(`verify:${token}`)
    if (!userId) {
      throw new InvalidTokenError()
    }

    const user = await this.users.findById(userId)
    if (!user) {
      throw new UserNotFoundError(userId)
    }

    user.verifyEmail()
    await this.users.save(user)
  }
}
