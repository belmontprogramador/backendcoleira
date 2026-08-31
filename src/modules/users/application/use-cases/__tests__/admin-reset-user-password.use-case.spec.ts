import { AdminResetUserPasswordUseCase } from '../admin-reset-user-password.use-case'
import {
  UserNotFoundError,
  HierarchyViolationError,
  EmailDeliveryError,
} from '../../errors'
import type { UserRepositoryPort } from '../../../domain/repositories/user.repository.port'
import type { UserAccessPort } from '../../../../../common/ports/user-access.port'
import type { PasswordHasherPort } from '../../../../../common/ports/password-hasher.port'
import type { PasswordGeneratorPort } from '../../../../../common/ports/password-generator.port'
import type { RefreshTokenStorePort } from '../../../../../common/ports/refresh-token-store.port'
import type { EmailSenderPort } from '../../../../../common/ports/email-sender.port'
import type { AuditLoggerPort } from '../../../../../common/ports/audit-logger.port'
import { User } from '../../../domain/entities/user.entity'
import { Email } from '../../../domain/value-objects/email.vo'

describe('AdminResetUserPasswordUseCase', () => {
  let users: jest.Mocked<UserRepositoryPort>
  let access: jest.Mocked<UserAccessPort>
  let hasher: jest.Mocked<PasswordHasherPort>
  let generator: jest.Mocked<PasswordGeneratorPort>
  let refreshTokens: jest.Mocked<RefreshTokenStorePort>
  let email: jest.Mocked<EmailSenderPort>
  let audit: jest.Mocked<AuditLoggerPort>
  let useCase: AdminResetUserPasswordUseCase

  beforeEach(() => {
    users = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      save: jest.fn(),
      list: jest.fn(),
      count: jest.fn(),
    }
    access = { resolveAccess: jest.fn() }
    hasher = { hash: jest.fn(), compare: jest.fn() }
    generator = { generate: jest.fn() }
    refreshTokens = {
      save: jest.fn(),
      isValid: jest.fn(),
      revoke: jest.fn(),
      revokeAllForUser: jest.fn(),
    }
    email = {
      sendVerificationEmail: jest.fn(),
      sendPasswordResetEmail: jest.fn(),
      sendAdminPasswordResetEmail: jest.fn(),
      sendTransferEmail: jest.fn(),
      sendContactMessageEmail: jest.fn(),
    }
    audit = { log: jest.fn() }
    useCase = new AdminResetUserPasswordUseCase(
      users,
      access,
      hasher,
      generator,
      refreshTokens,
      email,
      audit,
    )
  })

  it('gera nova senha, hasheia, salva, revoga sessões, envia email e audita', async () => {
    const user = User.create({
      id: 'u1',
      name: 'João',
      email: Email.create('joao@email.com'),
      passwordHash: 'old',
    })
    users.findById.mockResolvedValue(user)
    access.resolveAccess.mockResolvedValue({
      userId: 'u1',
      roles: ['USER'],
      permissions: [],
    })
    generator.generate.mockReturnValue('novaSenha123')
    hasher.hash.mockResolvedValue('new-hash')

    await useCase.execute(['ADMIN'], 'u1')

    expect(hasher.hash).toHaveBeenCalledWith('novaSenha123')
    expect(users.save).toHaveBeenCalled()
    expect(users.save.mock.calls[0][0].passwordHash).toBe('new-hash')
    expect(refreshTokens.revokeAllForUser).toHaveBeenCalledWith('u1')
    expect(email.sendAdminPasswordResetEmail).toHaveBeenCalledWith(
      'joao@email.com',
      'novaSenha123',
    )
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'password_reset_by_admin',
        entity: 'user',
        entityId: 'u1',
      }),
    )
  })

  it('ADMIN não pode resetar outro ADMIN (hierarquia)', async () => {
    const user = User.create({
      id: 'u2',
      name: 'Admin 2',
      email: Email.create('a2@email.com'),
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
    expect(generator.generate).not.toHaveBeenCalled()
    expect(users.save).not.toHaveBeenCalled()
  })

  it('SUPER_ADMIN pode resetar ADMIN', async () => {
    const user = User.create({
      id: 'u3',
      name: 'Admin',
      email: Email.create('a3@email.com'),
      passwordHash: 'x',
    })
    users.findById.mockResolvedValue(user)
    access.resolveAccess.mockResolvedValue({
      userId: 'u3',
      roles: ['ADMIN'],
      permissions: [],
    })
    generator.generate.mockReturnValue('novaSenha456')
    hasher.hash.mockResolvedValue('hash')

    await useCase.execute(['SUPER_ADMIN'], 'u3')

    expect(users.save).toHaveBeenCalled()
    expect(email.sendAdminPasswordResetEmail).toHaveBeenCalledWith(
      'a3@email.com',
      'novaSenha456',
    )
  })

  it('lança UserNotFoundError se não existir', async () => {
    users.findById.mockResolvedValue(null)

    await expect(useCase.execute(['ADMIN'], 'x')).rejects.toThrow(
      UserNotFoundError,
    )
  })

  it('se o envio de e-mail falha, NÃO altera a senha e lança EmailDeliveryError', async () => {
    const user = User.create({
      id: 'u4',
      name: 'Cliente',
      email: Email.create('cliente@email.com'),
      passwordHash: 'old-hash',
    })
    users.findById.mockResolvedValue(user)
    access.resolveAccess.mockResolvedValue({
      userId: 'u4',
      roles: ['USER'],
      permissions: [],
    })
    generator.generate.mockReturnValue('novaSenha789')
    hasher.hash.mockResolvedValue('hash')
    email.sendAdminPasswordResetEmail.mockRejectedValue(new Error('SMTP down'))

    await expect(useCase.execute(['ADMIN'], 'u4')).rejects.toThrow(
      EmailDeliveryError,
    )

    expect(users.save).not.toHaveBeenCalled()
    expect(refreshTokens.revokeAllForUser).not.toHaveBeenCalled()
    expect(audit.log).not.toHaveBeenCalled()
  })
})
