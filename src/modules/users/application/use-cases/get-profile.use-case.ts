import { Inject, Injectable } from '@nestjs/common'
import { USER_REPOSITORY_PORT } from '../../domain/repositories/user.repository.port'
import type { UserRepositoryPort } from '../../domain/repositories/user.repository.port'
import type { User } from '../../domain/entities/user.entity'
import { UserNotFoundError } from '../errors'

/**
 * Caso de uso: obter o perfil do usuário autenticado.
 */
@Injectable()
export class GetProfileUseCase {
  constructor(
    @Inject(USER_REPOSITORY_PORT) private readonly users: UserRepositoryPort,
  ) {}

  async execute(userId: string): Promise<User> {
    const user = await this.users.findById(userId)
    if (!user) {
      throw new UserNotFoundError(userId)
    }
    return user
  }
}
