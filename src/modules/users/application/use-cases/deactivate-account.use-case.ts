import { Inject, Injectable } from '@nestjs/common'
import { USER_REPOSITORY_PORT } from '../../domain/repositories/user.repository.port'
import type { UserRepositoryPort } from '../../domain/repositories/user.repository.port'
import { UserNotFoundError } from '../errors'

/**
 * Caso de uso: desativar a própria conta (soft delete).
 *
 * Nota (doc-sistema §44): antes do soft delete, verificar pets vinculados,
 * pingentes, assinaturas ativas e transferências pendentes. Essas verificações
 * são adicionadas quando os módulos correspondentes existirem (Fases 2, 3 e 7).
 */
@Injectable()
export class DeactivateAccountUseCase {
  constructor(
    @Inject(USER_REPOSITORY_PORT) private readonly users: UserRepositoryPort,
  ) {}

  async execute(userId: string): Promise<void> {
    const user = await this.users.findById(userId)
    if (!user) {
      throw new UserNotFoundError(userId)
    }

    user.deactivate()
    await this.users.save(user)
  }
}
