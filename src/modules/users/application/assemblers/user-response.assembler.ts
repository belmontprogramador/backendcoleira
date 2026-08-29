import { Inject, Injectable } from '@nestjs/common'
import { ROLE_REPOSITORY_PORT } from '../../domain/repositories/role.repository.port'
import type { RoleRepositoryPort } from '../../domain/repositories/role.repository.port'
import type { User } from '../../domain/entities/user.entity'
import { UserResponseMapper } from '../mappers/user-response.mapper'
import type { UserResponse } from '../mappers/user-response.mapper'

/**
 * Serviço de aplicação que monta o `UserResponse` final (agregado + RBAC).
 *
 * Existe porque `roles` e `permissions` são dados de RBAC que vivem fora do
 * agregado `User` (o domínio não conhece o modelo de permissões). Aqui
 * resolvemos ambos, ASSIGNADOS, via `RoleRepositoryPort` e delegamos a
 * projeção segura ao `UserResponseMapper` (puro).
 *
 * O uso em lote (`assembleMany`) faz DUAS consultas no total (uma para roles,
 * uma para permissões), independente do número de usuários — sem N+1.
 */
@Injectable()
export class UserResponseAssembler {
  constructor(
    @Inject(ROLE_REPOSITORY_PORT) private readonly roles: RoleRepositoryPort,
  ) {}

  async assemble(user: User): Promise<UserResponse> {
    const [rolesByUser, permissionsByUser] = await Promise.all([
      this.roles.findRolesByUserIds([user.id]),
      this.roles.findPermissionsByUserIds([user.id]),
    ])
    return UserResponseMapper.toResponse(
      user,
      rolesByUser.get(user.id) ?? [],
      permissionsByUser.get(user.id) ?? [],
    )
  }

  async assembleMany(users: User[]): Promise<UserResponse[]> {
    if (users.length === 0) {
      return []
    }
    const ids = users.map(user => user.id)
    const [rolesByUser, permissionsByUser] = await Promise.all([
      this.roles.findRolesByUserIds(ids),
      this.roles.findPermissionsByUserIds(ids),
    ])
    return users.map(user =>
      UserResponseMapper.toResponse(
        user,
        rolesByUser.get(user.id) ?? [],
        permissionsByUser.get(user.id) ?? [],
      ),
    )
  }
}
