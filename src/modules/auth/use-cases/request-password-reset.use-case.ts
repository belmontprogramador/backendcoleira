import { Inject, Injectable } from '@nestjs/common'
import { randomBytes } from 'node:crypto'
import { USER_REPOSITORY_PORT } from '../../users/domain/repositories/user.repository.port'
import type { UserRepositoryPort } from '../../users/domain/repositories/user.repository.port'
import { TEMPORARY_TOKEN_STORE_PORT } from '../../../common/ports/temporary-token-store.port'
import type { TemporaryTokenStorePort } from '../../../common/ports/temporary-token-store.port'
import { EMAIL_SENDER_PORT } from '../../../common/ports/email-sender.port'
import type { EmailSenderPort } from '../../../common/ports/email-sender.port'

const RESET_TTL_SECONDS = 3600 // 1 hora
const ENUMERATION_GUARD_DELAY_MS = 500

/**
 * Caso de uso: solicitar recuperação de senha.
 * Não vaza a existência do e-mail — responde igual se existir ou não.
 * Quando o e-mail não existe, aplica um delay sintético para igualar o tempo
 * de resposta (impede enumeração por timing).
 */
@Injectable()
export class RequestPasswordResetUseCase {
  constructor(
    @Inject(USER_REPOSITORY_PORT) private readonly users: UserRepositoryPort,
    @Inject(TEMPORARY_TOKEN_STORE_PORT)
    private readonly tokens: TemporaryTokenStorePort,
    @Inject(EMAIL_SENDER_PORT) private readonly email: EmailSenderPort,
  ) {}

  async execute(email: string): Promise<void> {
    const user = await this.users.findByEmail(email.toLowerCase())
    if (!user) {
      // Delay sintético: o caminho de e-mail inexistente leva o mesmo tempo
      // do caminho real (evita user enumeration por medição de tempo).
      await new Promise(resolve =>
        setTimeout(resolve, ENUMERATION_GUARD_DELAY_MS),
      )
      return
    }

    const token = randomBytes(32).toString('hex')
    await this.tokens.save(`reset:${token}`, user.id, RESET_TTL_SECONDS)
    await this.email.sendPasswordResetEmail(email, token)
  }
}
