import { UpdateUserStatusUseCase } from '../update-user-status.use-case'
import { UserNotFoundError, HierarchyViolationError } from '../../errors'
import type { UserRepositoryPort } from '../../../domain/repositories/user.repository.port'
import type { UserAccessPort } from '../../../../../common/ports/user-access.port'
import type { AuditLoggerPort } from '../../../../../common/ports/audit-logger.port'
import { User } from '../../../domain/entities/user.entity'
import { Email } from '../../../domain/value-objects/email.vo'

describe('UpdateUserStatusUseCase', () => {
  let users: jest.Mocked<UserRepositoryPort>
  let access: jest.Mocked<UserAccessPort>
  let audit: jest.Mocked<AuditLoggerPort>
  let useCase: UpdateUserStatusUseCase

  beforeEach(() => {
    users = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      save: jest.fn(),
      list: jest.fn(),
      count: jest.fn(),
    }
    access = { resolveAccess: jest.fn() }
    audit = { log: jest.fn() }
    useCase = new UpdateUserStatusUseCase(users, access, audit)
  })

  it('bloqueia um usuário de role inferior e audita', async () => {
    const user = User.create({
      id: 'u1',
      name: 'João',
      email: Email.create('joao@email.com'),
      passwordHash: 'x',
    })
    user.verifyEmail()
    users.findById.mockResolvedValue(user)
    access.resolveAccess.mockResolvedValue({
      userId: 'u1',
      roles: ['USER'],
      permissions: [],
    })

    const result = await useCase.execute(['ADMIN'], 'u1', 'BLOCKED')

    expect(result.status).toBe('BLOCKED')
    expect(users.save).toHaveBeenCalled()
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'status_change',
        entity: 'user',
        entityId: 'u1',
        metadata: { newStatus: 'BLOCKED' },
      }),
    )
  })

  it('ADMIN NÃO pode bloquear outro ADMIN', async () => {
    const user = User.create({
      id: 'u2',
      name: 'Admin 2',
      email: Email.create('admin2@email.com'),
      passwordHash: 'x',
    })
    users.findById.mockResolvedValue(user)
    access.resolveAccess.mockResolvedValue({
      userId: 'u2',
      roles: ['ADMIN'],
      permissions: [],
    })

    await expect(useCase.execute(['ADMIN'], 'u2', 'BLOCKED')).rejects.toThrow(
      HierarchyViolationError,
    )
  })

  it('ADMIN NÃO pode bloquear SUPER_ADMIN', async () => {
    const user = User.create({
      id: 'u3',
      name: 'Super',
      email: Email.create('super@email.com'),
      passwordHash: 'x',
    })
    users.findById.mockResolvedValue(user)
    access.resolveAccess.mockResolvedValue({
      userId: 'u3',
      roles: ['SUPER_ADMIN'],
      permissions: [],
    })

    await expect(useCase.execute(['ADMIN'], 'u3', 'BLOCKED')).rejects.toThrow(
      HierarchyViolationError,
    )
  })

  it('SUPER_ADMIN pode bloquear ADMIN', async () => {
    const user = User.create({
      id: 'u4',
      name: 'Admin',
      email: Email.create('admin@email.com'),
      passwordHash: 'x',
    })
    users.findById.mockResolvedValue(user)
    access.resolveAccess.mockResolvedValue({
      userId: 'u4',
      roles: ['ADMIN'],
      permissions: [],
    })

    const result = await useCase.execute(['SUPER_ADMIN'], 'u4', 'BLOCKED')
    expect(result.status).toBe('BLOCKED')
  })

  it('lança UserNotFoundError se não existir', async () => {
    users.findById.mockResolvedValue(null)

    await expect(useCase.execute(['ADMIN'], 'x', 'BLOCKED')).rejects.toThrow(
      UserNotFoundError,
    )
  })
})
