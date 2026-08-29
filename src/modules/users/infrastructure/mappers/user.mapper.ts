import { User, UserStatus } from '../../domain/entities/user.entity'
import { Email } from '../../domain/value-objects/email.vo'
import type { UserModel } from '../../../../generated/prisma/models/User'

/**
 * Converte o agregado `User` (domínio) para o formato de persistência Prisma
 * e vice-versa. Mantém o domínio desacoplado dos tipos do ORM.
 */
export class UserMapper {
  static toPersistence(user: User): {
    id: string
    name: string
    email: string
    password_hash: string
    phone: string | null
    status: UserStatus
    email_verified_at: Date | null
    last_login_at: Date | null
    created_at: Date
    updated_at: Date
    deleted_at: Date | null
  } {
    return {
      id: user.id,
      name: user.name,
      email: user.email.value,
      password_hash: user.passwordHash,
      phone: user.phone,
      status: user.status,
      email_verified_at: user.emailVerifiedAt,
      last_login_at: user.lastLoginAt,
      created_at: user.createdAt,
      updated_at: user.updatedAt,
      deleted_at: user.deletedAt,
    }
  }

  static toDomain(model: UserModel): User {
    return User.reconstitute({
      id: model.id,
      name: model.name,
      email: Email.create(model.email),
      passwordHash: model.password_hash,
      phone: model.phone,
      status: model.status as UserStatus,
      emailVerifiedAt: model.email_verified_at,
      lastLoginAt: model.last_login_at,
      createdAt: model.created_at,
      updatedAt: model.updated_at,
      deletedAt: model.deleted_at,
    })
  }
}
