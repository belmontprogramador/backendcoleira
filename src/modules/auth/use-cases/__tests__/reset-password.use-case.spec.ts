import { ResetPasswordUseCase } from '../reset-password.use-case'
import {
  UserNotFoundError,
  InvalidTokenError,
} from '../../../users/application/errors'
import type { UserRepositoryPort } from '../../../users/domain/repositories/user.repository.port'
import type { PasswordHasherPort } from '../../../../common/ports/password-hasher.port'
import type { TemporaryTokenStorePort } from '../../../../common/ports/temporary-token-store.port'
import { User } from '../../../users/domain/entities/user.entity'
import { Email } from '../../../users/domain/value-objects/email.vo'

describe('ResetPasswordUseCase', () => {
  let users: jest.Mocked<UserRepositoryPort>
  let hasher: jest.Mocked<PasswordHasherPort>
  let tokens: jest.Mocked<TemporaryTokenStorePort>
  let useCase: ResetPasswordUseCase

  beforeEach(() => {
    users = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      save: jest.fn(),
      list: jest.fn(),
      count: jest.fn(),
    }
    hasher = { hash: jest.fn(), compare: jest.fn() }
    tokens = { save: jest.fn(), consume: jest.fn() }
    useCase = new ResetPasswordUseCase(users, hasher, tokens)
  })

  it('reseta a senha com token válido', async () => {
    const user = User.create({
      id: 'u1',
      name: 'João',
      email: Email.create('joao@email.com'),
      passwordHash: 'old',
    })
    tokens.consume.mockResolvedValue('u1')
    users.findById.mockResolvedValue(user)
    hasher.hash.mockResolvedValue('new-hash')

    await useCase.execute('token-valido', 'novaSenha123')

    expect(user.passwordHash).toBe('new-hash')
    expect(users.save).toHaveBeenCalled()
  })

  it('rejeita token inválido', async () => {
    tokens.consume.mockResolvedValue(null)

    await expect(
      useCase.execute('token-invalido', 'novaSenha123'),
    ).rejects.toThrow(InvalidTokenError)
  })

  it('rejeita usuário inexistente (token válido, user apagado)', async () => {
    tokens.consume.mockResolvedValue('u1')
    users.findById.mockResolvedValue(null)

    await expect(
      useCase.execute('token-valido', 'novaSenha123'),
    ).rejects.toThrow(UserNotFoundError)
  })
})
