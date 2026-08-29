import type { User } from '../../domain/entities/user.entity'

export interface UserResponse {
  id: string
  name: string
  email: string
  phone: string | null
  status: string
  emailVerifiedAt: Date | null
  createdAt: Date
  roles: string[]
  permissions: string[]
}

/**
 * Converte um agregado `User` em DTO de resposta seguro (sem password_hash,
 * sem dados administrativos).
 *
 * `roles` são as roles ASSIGNADAS ao usuário; `permissions` são os códigos de
 * permissão ASSIGNADOS (união das roles) — ambos para exibição/UI, resolvidos
 * fora do agregado (o `User` de domínio não conhece RBAC).
 */
export class UserResponseMapper {
  static toResponse(
    user: User,
    roles: string[],
    permissions: string[],
  ): UserResponse {
    return {
      id: user.id,
      name: user.name,
      email: user.email.value,
      phone: user.phone,
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt,
      createdAt: user.createdAt,
      roles,
      permissions,
    }
  }
}
