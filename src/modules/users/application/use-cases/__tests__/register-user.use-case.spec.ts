import { RegisterUserUseCase } from '../register-user.use-case'
import { EmailAlreadyInUseError, RoleNotFoundError } from '../../errors'
import { Role } from '../../../../../common/constants/roles'
import type { PasswordHasherPort } from '../../../../../common/ports/password-hasher.port'
import type { UserRepositoryPort } from '../../../domain/repositories/user.repository.port'
import type { RoleRepositoryPort } from '../../../domain/repositories/role.repository.port'
import type { TemporaryTokenStorePort } from '../../../../../common/ports/temporary-token-store.port'
import type { EmailSenderPort } from '../../../../../common/ports/email-sender.port'

describe('RegisterUserUseCase', () => {
  let users: jest.Mocked<UserRepositoryPort>
  let roles: jest.Mocked<RoleRepositoryPort>
  let hasher: jest.Mocked<PasswordHasherPort>
  let tokens: jest.Mocked<TemporaryTokenStorePort>
  let email: jest.Mocked<EmailSenderPort>
  let useCase: RegisterUserUseCase

  beforeEach(() => {
    users = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      save: jest.fn(),
      list: jest.fn(),
      count: jest.fn(),
    }
    roles = {
      findByName: jest.fn(),
      setRole: jest.fn(),
      findRolesByUserIds: jest.fn(),
      findPermissionsByUserIds: jest.fn(),
    }
    hasher = { hash: jest.fn(), compare: jest.fn() }
    tokens = { save: jest.fn(), consume: jest.fn() }
    email = {
      sendVerificationEmail: jest.fn(),
      sendPasswordResetEmail: jest.fn(),
    }
    useCase = new RegisterUserUseCase(users, roles, hasher, tokens, email)
  })

  it('registra um novo usuário com senha hasheada e atribui a role USER', async () => {
    users.findByEmail.mockResolvedValue(null)
    hasher.hash.mockResolvedValue('hashed-password')
    roles.findByName.mockResolvedValue({ id: 'role-user-id', name: 'USER' })

    const result = await useCase.execute({
      name: 'João',
      email: 'joao@email.com',
      password: 'senhaForte123',
      phone: '+5521999999999',
    })

    expect(result.id).toBeTruthy()
    expect(hasher.hash).toHaveBeenCalledWith('senhaForte123')
    expect(users.save).toHaveBeenCalled()
    const saved = users.save.mock.calls[0][0]
    expect(saved.passwordHash).toBe('hashed-password')
    expect(saved.status).toBe('PENDING_VERIFICATION')
    expect(roles.findByName).toHaveBeenCalledWith(Role.USER)
    expect(roles.setRole).toHaveBeenCalledWith(result.id, 'role-user-id')
  })

  it('gera token de verificação e envia email após registrar', async () => {
    users.findByEmail.mockResolvedValue(null)
    hasher.hash.mockResolvedValue('hashed-password')
    roles.findByName.mockResolvedValue({ id: 'role-user-id', name: 'USER' })

    const result = await useCase.execute({
      name: 'João',
      email: 'joao@email.com',
      password: 'senhaForte123',
    })

    // token de verificação armazenado (chave verify:<token> → userId, TTL 24h)
    expect(tokens.save).toHaveBeenCalledWith(
      expect.stringMatching(/^verify:[0-9a-f]{64}$/),
      result.id,
      86400,
    )
    // email de verificação enviado com o token (sem o prefixo da chave)
    const call = (email.sendVerificationEmail as jest.Mock).mock.calls[0] as [
      string,
      string,
    ]
    expect(call[0]).toBe('joao@email.com')
    expect(call[1]).toMatch(/^[0-9a-f]{64}$/)
  })

  it('rejeita se a role USER não existir', async () => {
    users.findByEmail.mockResolvedValue(null)
    hasher.hash.mockResolvedValue('hashed-password')
    roles.findByName.mockResolvedValue(null)

    await expect(
      useCase.execute({
        name: 'João',
        email: 'joao@email.com',
        password: 'senhaForte123',
      }),
    ).rejects.toThrow(RoleNotFoundError)
  })

  it('rejeita email já cadastrado', async () => {
    users.findByEmail.mockResolvedValue({} as never)

    await expect(
      useCase.execute({
        name: 'João',
        email: 'joao@email.com',
        password: 'senhaForte123',
      }),
    ).rejects.toThrow(EmailAlreadyInUseError)
  })

  it('rejeita email inválido (via value object)', async () => {
    await expect(
      useCase.execute({
        name: 'João',
        email: 'email-invalido',
        password: 'senhaForte123',
      }),
    ).rejects.toThrow()
  })

  it('rejeita senha fraca (via value object)', async () => {
    await expect(
      useCase.execute({
        name: 'João',
        email: 'joao@email.com',
        password: 'curta',
      }),
    ).rejects.toThrow()
  })
})
