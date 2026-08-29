export enum Role {
  USER = 'USER',
  SUPPORT = 'SUPPORT',
  OPERATOR = 'OPERATOR',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

/** Hierarquia de poder (do menor para o maior). */
export const ROLE_HIERARCHY: Role[] = [
  Role.USER,
  Role.SUPPORT,
  Role.OPERATOR,
  Role.ADMIN,
  Role.SUPER_ADMIN,
]

/** Permissões administrativas reservadas ao SUPER_ADMIN. */
export const SUPER_ADMIN_ONLY_PERMISSIONS = [
  'user:role',
  'role:manage',
  'permission:manage',
]

/** Retorna o índice hierárquico de uma role (-1 se desconhecida). */
export function roleRank(role: string): number {
  return ROLE_HIERARCHY.indexOf(role as Role)
}

/** Retorna a maior role (índice) de um conjunto de roles. */
export function highestRank(roles: string[]): number {
  if (roles.length === 0) {
    return -1
  }
  return Math.max(...roles.map(roleRank))
}

/**
 * Regra de hierarquia: um ator só pode gerenciar (status/role) um alvo cuja
 * role seja **estritamente inferior** à sua.
 *
 * - ADMIN não gerencia ADMIN nem SUPER_ADMIN.
 * - SUPER_ADMIN gerencia todos, exceto outro SUPER_ADMIN.
 */
export function canManage(
  actorRoles: string[],
  targetRoles: string[],
): boolean {
  const actorRank = highestRank(actorRoles)
  const targetRank = highestRank(targetRoles)
  return actorRank > targetRank
}
