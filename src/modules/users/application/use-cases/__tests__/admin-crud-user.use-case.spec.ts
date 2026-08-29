import { AdminUpdateUserUseCase } from '../admin-update-user.use-case'
import { AdminDeleteUserUseCase } from '../admin-delete-user.use-case'
import { AdminGetUserUseCase } from '../admin-get-user.use-case'
import { HierarchyViolationError, UserNotFoundError } from '../../errors'
import type { UserRepositoryPort } from '../../../domain/repositories/user.repository.port'
import type { UserAccessPort } from '../../../../../common/ports/user-access.port'
import type { AuditLoggerPort } from '../../../../../common/ports/audit-logger.port'
import { User } from '../../../domain/entities/user.entity'
import { Email } from '../../../domain/value-objects/email.vo'

describe('Admin CRUD de usuário cliente', () => {
  let users: jest.Mocked<UserRepositoryPort>
  let access: jest.Mocked<UserAccessPort>
  let audit: jest.Mocked<AuditLoggerPort>

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
  })

  function makeUser(role: string) {
    return User.create({
      id: 'target-1',
      name: 'Cliente',
      email: Email.create('cliente@email.com'),
      passwordHash: 'h',
    })
  }

  describe('AdminUpdateUserUseCase', () => {
    it('ADMIN atualiza dados de um USER (hierarquia inferior)', async () => {
      const user = makeUser('USER')
      users.findById.mockResolvedValue(user)
      access.resolveAccess.mockResolvedValue({
        userId: 'target-1',
        roles: ['USER'],
        permissions: [],
      })
      const useCase = new AdminUpdateUserUseCase(users, access, audit)

      const result = await useCase.execute(['ADMIN'], 'target-1', {
        name: 'Cliente Editado',
      })

      expect(result.name).toBe('Cliente Editado')
      expect(users.save).toHaveBeenCalled()
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'update' }),
      )
    })

    it('ADMIN NÃO atualiza outro ADMIN (hierarquia)', async () => {
      users.findById.mockResolvedValue(makeUser('ADMIN'))
      access.resolveAccess.mockResolvedValue({
        userId: 'target-1',
        roles: ['ADMIN'],
        permissions: [],
      })
      const useCase = new AdminUpdateUserUseCase(users, access, audit)

      await expect(
        useCase.execute(['ADMIN'], 'target-1', { name: 'X' }),
      ).rejects.toThrow(HierarchyViolationError)
    })
  })

  describe('AdminDeleteUserUseCase', () => {
    it('ADMIN desativa um USER (soft delete)', async () => {
      const user = makeUser('USER')
      users.findById.mockResolvedValue(user)
      access.resolveAccess.mockResolvedValue({
        userId: 'target-1',
        roles: ['USER'],
        permissions: [],
      })
      const useCase = new AdminDeleteUserUseCase(users, access, audit)

      await useCase.execute(['ADMIN'], 'target-1')

      expect(users.save).toHaveBeenCalled()
      const saved = users.save.mock.calls[0][0]
      expect(saved.deletedAt).not.toBeNull()
    })

    it('ADMIN NÃO deleta SUPER_ADMIN', async () => {
      users.findById.mockResolvedValue(makeUser('SUPER_ADMIN'))
      access.resolveAccess.mockResolvedValue({
        userId: 'target-1',
        roles: ['SUPER_ADMIN'],
        permissions: [],
      })
      const useCase = new AdminDeleteUserUseCase(users, access, audit)

      await expect(useCase.execute(['ADMIN'], 'target-1')).rejects.toThrow(
        HierarchyViolationError,
      )
    })
  })

  describe('AdminGetUserUseCase', () => {
    it('ADMIN vê detalhe de USER', async () => {
      const user = makeUser('USER')
      users.findById.mockResolvedValue(user)
      access.resolveAccess.mockResolvedValue({
        userId: 'target-1',
        roles: ['USER'],
        permissions: [],
      })
      const useCase = new AdminGetUserUseCase(users, access)

      const result = await useCase.execute(['ADMIN'], 'target-1')
      expect(result.id).toBe('target-1')
    })

    it('lança UserNotFoundError se não existe', async () => {
      users.findById.mockResolvedValue(null)
      const useCase = new AdminGetUserUseCase(users, access)

      await expect(useCase.execute(['ADMIN'], 'x')).rejects.toThrow(
        UserNotFoundError,
      )
    })
  })
})
