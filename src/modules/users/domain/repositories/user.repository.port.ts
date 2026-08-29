import type { User } from '../entities/user.entity'

export interface ListUsersFilter {
  page: number
  limit: number
  status?: string
  /**
   * Roles para filtrar (nomes, case-insensitive). `NONE` = usuários sem role
   * atribuída. Semântica OR: retorna usuários cuja role atribuída está na
   * lista (ou sem role, quando `NONE` está presente).
   */
  role?: string[]
}

/**
 * Porta do repositório de usuários.
 *
 * DIP: o domínio e a aplicação dependem desta interface. A implementação
 * concreta (Prisma) vive na infraestrutura.
 */
export interface UserRepositoryPort {
  findById(id: string): Promise<User | null>
  findByEmail(email: string): Promise<User | null>
  save(user: User): Promise<void>
  list(filter: ListUsersFilter): Promise<User[]>
  count(filter: ListUsersFilter): Promise<number>
}

export const USER_REPOSITORY_PORT = Symbol('USER_REPOSITORY_PORT')
