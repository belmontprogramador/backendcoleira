import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../../infrastructure/database/prisma.service'
import { Prisma } from '../../../../generated/prisma/client'
import type { UserStatus } from '../../../../generated/prisma/enums'
import type { User } from '../../domain/entities/user.entity'
import type {
  ListUsersFilter,
  UserRepositoryPort,
} from '../../domain/repositories/user.repository.port'
import { UserMapper } from '../mappers/user.mapper'

/**
 * Implementação concreta do `UserRepositoryPort` usando Prisma 7.
 * Infraestrutura plugável — a aplicação depende da porta, nunca desta classe.
 */
@Injectable()
export class PrismaUserRepository implements UserRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    const model = await this.prisma.user.findUnique({ where: { id } })
    return model ? UserMapper.toDomain(model) : null
  }

  async findByEmail(email: string): Promise<User | null> {
    const model = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })
    return model ? UserMapper.toDomain(model) : null
  }

  async save(user: User): Promise<void> {
    const data = UserMapper.toPersistence(user)
    await this.prisma.user.upsert({
      where: { id: user.id },
      create: data,
      update: data,
    })
  }

  async list(filter: ListUsersFilter): Promise<User[]> {
    const models = await this.prisma.user.findMany({
      where: this.buildWhere(filter),
      skip: (filter.page - 1) * filter.limit,
      take: filter.limit,
      orderBy: { created_at: 'desc' },
    })
    return models.map(UserMapper.toDomain)
  }

  async count(filter: ListUsersFilter): Promise<number> {
    return this.prisma.user.count({
      where: this.buildWhere(filter),
    })
  }

  private buildWhere(
    filter: ListUsersFilter,
  ): Prisma.UserWhereInput | undefined {
    const conditions: Prisma.UserWhereInput[] = []

    if (filter.status) {
      conditions.push({ status: filter.status as UserStatus })
    }

    const roles = filter.role
    if (roles && roles.length > 0) {
      const named = roles.filter(role => role !== 'NONE')
      const or: Prisma.UserWhereInput[] = []
      if (named.length > 0) {
        or.push({ roles: { some: { role: { name: { in: named } } } } })
      }
      if (roles.includes('NONE')) {
        or.push({ roles: { none: {} } })
      }
      conditions.push({ OR: or })
    }

    return conditions.length > 0 ? { AND: conditions } : undefined
  }
}
