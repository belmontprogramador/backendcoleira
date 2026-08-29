import { Inject, Injectable } from '@nestjs/common'
import { USER_REPOSITORY_PORT } from '../../domain/repositories/user.repository.port'
import type { UserRepositoryPort } from '../../domain/repositories/user.repository.port'
import type { User } from '../../domain/entities/user.entity'
import { UserNotFoundError } from '../errors'

export interface UpdateProfileInput {
  name?: string
  phone?: string | null
}

/**
 * Caso de uso: atualizar nome/telefone do próprio perfil.
 */
@Injectable()
export class UpdateProfileUseCase {
  constructor(
    @Inject(USER_REPOSITORY_PORT) private readonly users: UserRepositoryPort,
  ) {}

  async execute(userId: string, input: UpdateProfileInput): Promise<User> {
    const user = await this.users.findById(userId)
    if (!user) {
      throw new UserNotFoundError(userId)
    }

    user.updateProfile(input)
    await this.users.save(user)

    return user
  }
}
