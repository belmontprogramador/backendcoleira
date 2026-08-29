import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../../infrastructure/database/prisma.service'
import type { RoleInfo } from '../../domain/repositories/role.repository.port'
import type { RoleRepositoryPort } from '../../domain/repositories/role.repository.port'

/**
 * Implementação concreta do repositório de roles (RBAC administrativo).
 */
@Injectable()
export class PrismaRoleRepository implements RoleRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findByName(name: string): Promise<RoleInfo | null> {
    const role = await this.prisma.role.findUnique({ where: { name } })
    return role ? { id: role.id, name: role.name } : null
  }

  async setRole(userId: string, roleId: string): Promise<void> {
    // Substitui todas as roles do usuário por uma única, atomicamente.
    await this.prisma.$transaction([
      this.prisma.userRole.deleteMany({ where: { user_id: userId } }),
      this.prisma.userRole.create({
        data: { user_id: userId, role_id: roleId },
      }),
    ])
  }

  async findRolesByUserIds(userIds: string[]): Promise<Map<string, string[]>> {
    if (userIds.length === 0) {
      return new Map()
    }

    const rows = await this.prisma.userRole.findMany({
      where: { user_id: { in: userIds } },
      include: { role: true },
      orderBy: { role: { name: 'asc' } },
    })

    const map = new Map<string, string[]>(userIds.map(id => [id, []]))
    for (const row of rows) {
      map.get(row.user_id)?.push(row.role.name)
    }
    return map
  }

  async findPermissionsByUserIds(
    userIds: string[],
  ): Promise<Map<string, string[]>> {
    if (userIds.length === 0) {
      return new Map()
    }

    const rows = await this.prisma.userRole.findMany({
      where: { user_id: { in: userIds } },
      include: {
        role: { include: { permissions: { include: { permission: true } } } },
      },
    })

    const map = new Map<string, string[]>(userIds.map(id => [id, []]))
    for (const row of rows) {
      const codes = map.get(row.user_id)
      if (!codes) continue
      for (const rp of row.role.permissions) {
        if (!codes.includes(rp.permission.code)) {
          codes.push(rp.permission.code)
        }
      }
    }
    for (const codes of map.values()) {
      codes.sort()
    }
    return map
  }
}
