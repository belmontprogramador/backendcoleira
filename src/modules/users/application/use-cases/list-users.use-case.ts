import { Inject, Injectable } from '@nestjs/common'
import { USER_REPOSITORY_PORT } from '../../domain/repositories/user.repository.port'
import type {
  ListUsersFilter,
  UserRepositoryPort,
} from '../../domain/repositories/user.repository.port'
import type { User } from '../../domain/entities/user.entity'

/**
 * Resultado paginado de listagem de usuários.
 *
 * `total` é o total GLOBAL de usuários que batem com o filtro (ignorando a
 * página atual) — necessário para o front calcular número de páginas.
 */
export interface PaginatedUsersResult {
  data: User[]
  total: number
  page: number
  limit: number
}

/**
 * Caso de uso: listar usuários (admin), com paginação e filtros de status/role.
 *
 * Retorna `data` (página atual) + `total` (contagem global) em uma única
 * chamada — sem N+1 (list e count rodam em paralelo).
 */
@Injectable()
export class ListUsersUseCase {
  constructor(
    @Inject(USER_REPOSITORY_PORT) private readonly users: UserRepositoryPort,
  ) {}

  async execute(filter: ListUsersFilter): Promise<PaginatedUsersResult> {
    const [data, total] = await Promise.all([
      this.users.list(filter),
      this.users.count(filter),
    ])
    return { data, total, page: filter.page, limit: filter.limit }
  }
}
