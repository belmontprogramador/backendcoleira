import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../../infrastructure/database/prisma.service'
import type {
  UserAccess,
  UserAccessPort,
} from '../../../../common/ports/user-access.port'

/**
 * Implementação concreta do controle de acesso (RBAC) usando Prisma.
 * Resolve as roles e permissões efetivas de um usuário a partir das
 * tabelas de junção (user_roles, role_permissions).
 */
@Injectable()
export class PrismaUserAccessRepository implements UserAccessPort {
  constructor(private readonly prisma: PrismaService) {}

  async resolveAccess(userId: string): Promise<UserAccess | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    })

    if (!user) {
      return null
    }

    // Revogação imediata (OW1): usuário bloqueado ou soft-deletado não tem
    // acesso, mesmo que o access token ainda não tenha expirado.
    if (user.status === 'BLOCKED' || user.deleted_at !== null) {
      return null
    }

    const roles: string[] = []
    const permissions = new Set<string>()

    for (const userRole of user.roles) {
      roles.push(userRole.role.name)
      for (const rp of userRole.role.permissions) {
        permissions.add(rp.permission.code)
      }
    }

    return { userId, roles, permissions: [...permissions] }
  }
}
