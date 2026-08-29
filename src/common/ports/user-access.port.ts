export interface UserAccess {
  userId: string
  roles: string[]
  permissions: string[]
}

/**
 * Porta de controle de acesso (RBAC).
 * Resolve as roles e permissões efetivas de um usuário.
 *
 * Transversal: consumida por guards/strategies (common, auth) e implementada
 * na infraestrutura. Fica em `common/ports` para que `common` não dependa de
 * nenhum módulo específico.
 */
export interface UserAccessPort {
  resolveAccess(userId: string): Promise<UserAccess | null>
}

export const USER_ACCESS_PORT = Symbol('USER_ACCESS_PORT')
