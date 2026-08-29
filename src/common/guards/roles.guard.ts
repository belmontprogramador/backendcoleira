import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ROLES_KEY } from '../decorators/roles.decorator'
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator'
import { Role } from '../constants/roles'
import { USER_ACCESS_PORT } from '../ports/user-access.port'
import type { UserAccessPort } from '../ports/user-access.port'

interface AuthedRequest {
  user?: {
    sub: string
    email: string
    roles?: string[]
    permissions?: string[]
  }
}

/**
 * Guard de autorização (RBAC).
 *
 * Verifica `@Roles(...)` e/ou `@Permissions(...)` da rota contra as roles e
 * permissões do usuário autenticado. `SUPER_ADMIN` tem bypass total.
 *
 * As roles/permissões podem vir já populadas no request.user (setadas pela
 * JwtStrategy) — senão o guard resolve do banco via `UserAccessPort`.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(USER_ACCESS_PORT) private readonly access: UserAccessPort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    )
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    )

    // Sem metadata de role/permission → rota aberta à autorização.
    if (!requiredRoles && !requiredPermissions) {
      return true
    }

    const request = context.switchToHttp().getRequest<AuthedRequest>()
    const user = request.user

    if (!user) {
      throw new ForbiddenException('Acesso negado')
    }

    // Resolve roles/permissões se ainda não populadas no request.
    let roles = user.roles
    let permissions = user.permissions

    if (!roles || !permissions) {
      const resolved = await this.access.resolveAccess(user.sub)
      roles = resolved?.roles ?? []
      permissions = resolved?.permissions ?? []
    }

    // SUPER_ADMIN é "deus do sistema": bypass total.
    if (roles.includes(Role.SUPER_ADMIN)) {
      return true
    }

    if (requiredRoles && !requiredRoles.some(role => roles.includes(role))) {
      throw new ForbiddenException('Acesso negado')
    }

    if (
      requiredPermissions &&
      !requiredPermissions.some(perm => permissions.includes(perm))
    ) {
      throw new ForbiddenException('Acesso negado')
    }

    return true
  }
}
