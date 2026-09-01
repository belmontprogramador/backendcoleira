import { RestoreUserUseCase } from '../restore-user.use-case'
import { UserNotFoundError, HierarchyViolationError } from '../../errors'
import type { UserRepositoryPort } from '../../../domain/repositories/user.repository.port'
import type { UserAccessPort } from '../../../../../common/ports/user-access.port'
import type { AuditLoggerPort } from '../../../../../common/ports/audit-logger.port'
import { User } from '../../../domain/entities/user.entity'
import { Email } from '../../../domain/value-objects/email.vo'

describe('RestoreUserUseCase', () => {
  let users: jest.Mocked<UserRepositoryPort>
  let access: jest.Mocked<UserAccessPort>
  let audit: jest.Mocked<AuditLoggerPort>
  let useCase: RestoreUserUseCase

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
    useCase = new RestoreUserUseCase(users, access, audit)
  })

  it('reativa um usuário desativado e audita', async () => {
    const user = User.create({
      id: 'u1',
      name: 'João',
      email: Email.create('joao@email.com'),
      passwordHash: 'x',
    })
    user.deactivate()
    users.findById.mockResolvedValue(user)
    access.resolveAccess.mockResolvedValue({
      userId: 'u1',
      roles: ['USER'],
      permissions: [],
    })

    const result = await useCase.execute(['ADMIN'], 'u1')

    expect(result.status).toBe('ACTIVE')
    expect(result.deletedAt).toBeNull()
    expect(users.save).toHaveBeenCalled()
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'restore',
        entity: 'user',
        entityId: 'u1',
      }),
    )
  })

  it('ADMIN NÃO reativa outro ADMIN (hierarquia)', async () => {
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

    await expect(useCase.execute(['ADMIN'], 'u2')).rejects.toThrow(
      HierarchyViolationError,
    )
  })

  it('lança UserNotFoundError se não existir', async () => {
    users.findById.mockResolvedValue(null)

    await expect(useCase.execute(['ADMIN'], 'x')).rejects.toThrow(
      UserNotFoundError,
    )
  })
})
