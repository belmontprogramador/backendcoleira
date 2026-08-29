import { UpdateUserRoleUseCase } from '../update-user-role.use-case'
import {
  UserNotFoundError,
  RoleNotFoundError,
  HierarchyViolationError,
} from '../../errors'
import type { UserRepositoryPort } from '../../../domain/repositories/user.repository.port'
import type { UserAccessPort } from '../../../../../common/ports/user-access.port'
import type { RoleRepositoryPort } from '../../../domain/repositories/role.repository.port'
import type { AuditLoggerPort } from '../../../../../common/ports/audit-logger.port'
import { User } from '../../../domain/entities/user.entity'
import { Email } from '../../../domain/value-objects/email.vo'

describe('UpdateUserRoleUseCase', () => {
  let users: jest.Mocked<UserRepositoryPort>
  let access: jest.Mocked<UserAccessPort>
  let roles: jest.Mocked<RoleRepositoryPort>
  let audit: jest.Mocked<AuditLoggerPort>
  let useCase: UpdateUserRoleUseCase

  beforeEach(() => {
    users = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      save: jest.fn(),
      list: jest.fn(),
      count: jest.fn(),
    }
    access = { resolveAccess: jest.fn() }
    roles = {
      findByName: jest.fn(),
      setRole: jest.fn(),
    }
    audit = { log: jest.fn() }
    useCase = new UpdateUserRoleUseCase(users, access, roles, audit)
  })

  it('substitui a role de um usuário de hierarquia inferior e audita', async () => {
    const user = User.create({
      id: 'u1',
      name: 'João',
      email: Email.create('joao@email.com'),
      passwordHash: 'x',
    })
    users.findById.mockResolvedValue(user)
    access.resolveAccess.mockResolvedValue({
      userId: 'u1',
      roles: ['USER'],
      permissions: [],
    })
    roles.findByName.mockResolvedValue({ id: 'r1', name: 'OPERATOR' })

    await useCase.execute(['SUPER_ADMIN'], 'u1', 'OPERATOR')

    expect(roles.setRole).toHaveBeenCalledWith('u1', 'r1')
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'role_change',
        entity: 'user',
        entityId: 'u1',
        metadata: { role: 'OPERATOR' },
      }),
    )
  })

  it('NÃO pode promover a SUPER_ADMIN (user nunca vira super admin)', async () => {
    const user = User.create({
      id: 'u1',
      name: 'João',
      email: Email.create('joao@email.com'),
      passwordHash: 'x',
    })
    users.findById.mockResolvedValue(user)
    access.resolveAccess.mockResolvedValue({
      userId: 'u1',
      roles: ['ADMIN'],
      permissions: [],
    })

    await expect(
      useCase.execute(['SUPER_ADMIN'], 'u1', 'SUPER_ADMIN'),
    ).rejects.toThrow(HierarchyViolationError)
    expect(roles.setRole).not.toHaveBeenCalled()
  })

  it('SUPER_ADMIN NÃO pode alterar role de outro SUPER_ADMIN', async () => {
    const user = User.create({
      id: 'u2',
      name: 'Super 2',
      email: Email.create('super2@email.com'),
      passwordHash: 'x',
    })
    users.findById.mockResolvedValue(user)
    access.resolveAccess.mockResolvedValue({
      userId: 'u2',
      roles: ['SUPER_ADMIN'],
      permissions: [],
    })

    await expect(
      useCase.execute(['SUPER_ADMIN'], 'u2', 'ADMIN'),
    ).rejects.toThrow(HierarchyViolationError)
  })

  it('lança RoleNotFoundError se a role não existe', async () => {
    const user = User.create({
      id: 'u1',
      name: 'João',
      email: Email.create('joao@email.com'),
      passwordHash: 'x',
    })
    users.findById.mockResolvedValue(user)
    access.resolveAccess.mockResolvedValue({
      userId: 'u1',
      roles: ['USER'],
      permissions: [],
    })
    roles.findByName.mockResolvedValue(null)

    await expect(
      useCase.execute(['SUPER_ADMIN'], 'u1', 'NAO_EXISTE'),
    ).rejects.toThrow(RoleNotFoundError)
  })

  it('lança UserNotFoundError se usuário não existe', async () => {
    users.findById.mockResolvedValue(null)

    await expect(
      useCase.execute(['SUPER_ADMIN'], 'x', 'ADMIN'),
    ).rejects.toThrow(UserNotFoundError)
  })
})
