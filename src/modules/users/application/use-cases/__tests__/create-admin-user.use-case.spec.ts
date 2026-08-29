import { CreateAdminUserUseCase } from '../create-admin-user.use-case'
import {
  EmailAlreadyInUseError,
  HierarchyViolationError,
  RoleNotFoundError,
} from '../../errors'
import type { UserRepositoryPort } from '../../../domain/repositories/user.repository.port'
import type { RoleRepositoryPort } from '../../../domain/repositories/role.repository.port'
import type { PasswordHasherPort } from '../../../../../common/ports/password-hasher.port'
import type { AuditLoggerPort } from '../../../../../common/ports/audit-logger.port'
import { User } from '../../../domain/entities/user.entity'
import { Email } from '../../../domain/value-objects/email.vo'

describe('CreateAdminUserUseCase', () => {
  let users: jest.Mocked<UserRepositoryPort>
  let roles: jest.Mocked<RoleRepositoryPort>
  let hasher: jest.Mocked<PasswordHasherPort>
  let audit: jest.Mocked<AuditLoggerPort>
  let useCase: CreateAdminUserUseCase

  beforeEach(() => {
    users = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      save: jest.fn(),
      list: jest.fn(),
      count: jest.fn(),
    }
    roles = { findByName: jest.fn(), setRole: jest.fn() }
    hasher = { hash: jest.fn(), compare: jest.fn() }
    audit = { log: jest.fn() }
    useCase = new CreateAdminUserUseCase(users, roles, hasher, audit)
  })

  it('SUPER_ADMIN cria um ADMIN já verificado e ativo', async () => {
    users.findByEmail.mockResolvedValue(null)
    roles.findByName.mockResolvedValue({ id: 'r1', name: 'ADMIN' })
    hasher.hash.mockResolvedValue('hash123')

    const result = await useCase.execute(['SUPER_ADMIN'], {
      name: 'Novo Admin',
      email: 'novoadmin@email.com',
      password: 'senhaForte123',
      role: 'ADMIN',
    })

    expect(result).toHaveProperty('id')
    const saved = users.save.mock.calls[0][0]
    expect(saved.status).toBe('ACTIVE')
    expect(saved.emailVerifiedAt).not.toBeNull()
    expect(roles.setRole).toHaveBeenCalledWith(saved.id, 'r1')
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'role_change', entityId: saved.id }),
    )
  })

  it('SUPER_ADMIN cria outro SUPER_ADMIN', async () => {
    users.findByEmail.mockResolvedValue(null)
    roles.findByName.mockResolvedValue({ id: 'r2', name: 'SUPER_ADMIN' })
    hasher.hash.mockResolvedValue('hash123')

    await useCase.execute(['SUPER_ADMIN'], {
      name: 'Super 2',
      email: 'super2@email.com',
      password: 'senhaForte123',
      role: 'SUPER_ADMIN',
    })

    expect(roles.setRole).toHaveBeenCalled()
  })

  it('ADMIN NÃO pode criar admin (hierarquia)', async () => {
    await expect(
      useCase.execute(['ADMIN'], {
        name: 'X',
        email: 'x@email.com',
        password: 'senhaForte123',
        role: 'ADMIN',
      }),
    ).rejects.toThrow(HierarchyViolationError)
    expect(users.save).not.toHaveBeenCalled()
  })

  it('lança EmailAlreadyInUseError se email já existe', async () => {
    users.findByEmail.mockResolvedValue(
      User.create({
        id: 'x',
        name: 'X',
        email: Email.create('dup@email.com'),
        passwordHash: 'h',
      }),
    )

    await expect(
      useCase.execute(['SUPER_ADMIN'], {
        name: 'X',
        email: 'dup@email.com',
        password: 'senhaForte123',
        role: 'ADMIN',
      }),
    ).rejects.toThrow(EmailAlreadyInUseError)
  })

  it('lança RoleNotFoundError se role não existe', async () => {
    users.findByEmail.mockResolvedValue(null)
    roles.findByName.mockResolvedValue(null)

    await expect(
      useCase.execute(['SUPER_ADMIN'], {
        name: 'X',
        email: 'x@email.com',
        password: 'senhaForte123',
        role: 'ADMIN',
      }),
    ).rejects.toThrow(RoleNotFoundError)
  })
})
