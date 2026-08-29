export interface RoleInfo {
  id: string
  name: string
}

/**
 * Porta do repositório de roles (para operações administrativas de RBAC).
 */
export interface RoleRepositoryPort {
  findByName(name: string): Promise<RoleInfo | null>
  /** Substitui TODAS as roles do usuário por uma única (um usuário = uma role). */
  setRole(userId: string, roleId: string): Promise<void>
  /**
   * Resolve as roles (nomes) atribuídas a cada usuário, em lote.
   * Retorna um `Map` com TODOS os ids solicitados como chave — usuários sem
   * role mapeiam para array vazio. Usa as roles ASSIGNADAS (não as efetivas),
   * ou seja, não aplica filtro de status/deleted (serve para exibição).
   */
  findRolesByUserIds(userIds: string[]): Promise<Map<string, string[]>>
  /**
   * Resolve os códigos de permissão atribuídos a cada usuário, em lote.
   * Retorna um `Map` com TODOS os ids solicitados como chave — usuários sem
   * role/permissão mapeiam para array vazio. Usa permissões ASSIGNADAS (união
   * das roles atribuídas), deduplicadas e ordenadas alfabeticamente.
   */
  findPermissionsByUserIds(userIds: string[]): Promise<Map<string, string[]>>
}

export const ROLE_REPOSITORY_PORT = Symbol('ROLE_REPOSITORY_PORT')
