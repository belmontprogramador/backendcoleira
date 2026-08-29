import { VerifyEmailUseCase } from '../verify-email.use-case'
import {
  UserNotFoundError,
  InvalidTokenError,
} from '../../../users/application/errors'
import type { UserRepositoryPort } from '../../../users/domain/repositories/user.repository.port'
import type { TemporaryTokenStorePort } from '../../../../common/ports/temporary-token-store.port'
import { User } from '../../../users/domain/entities/user.entity'
import { Email } from '../../../users/domain/value-objects/email.vo'

describe('VerifyEmailUseCase', () => {
  let users: jest.Mocked<UserRepositoryPort>
  let tokens: jest.Mocked<TemporaryTokenStorePort>
  let useCase: VerifyEmailUseCase

  beforeEach(() => {
    users = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      save: jest.fn(),
      list: jest.fn(),
      count: jest.fn(),
    }
    tokens = { save: jest.fn(), consume: jest.fn() }
    useCase = new VerifyEmailUseCase(users, tokens)
  })

  it('verifica o email do usuário apontado pelo token', async () => {
    const user = User.create({
      id: 'u1',
      name: 'João',
      email: Email.create('joao@email.com'),
      passwordHash: 'x',
    })
    users.findById.mockResolvedValue(user)
    tokens.consume.mockResolvedValue('u1')

    await useCase.execute('token-valido')

    // usa o userId do token (não um email vindo do body)
    expect(users.findById).toHaveBeenCalledWith('u1')
    expect(users.findByEmail).not.toHaveBeenCalled()
    expect(user.status).toBe('ACTIVE')
    expect(user.emailVerifiedAt).not.toBeNull()
    expect(users.save).toHaveBeenCalled()
  })

  it('rejeita token inválido', async () => {
    tokens.consume.mockResolvedValue(null)

    await expect(useCase.execute('token-invalido')).rejects.toThrow(
      InvalidTokenError,
    )
  })

  it('rejeita se o usuário do token não existe mais', async () => {
    tokens.consume.mockResolvedValue('u1')
    users.findById.mockResolvedValue(null)

    await expect(useCase.execute('token-valido')).rejects.toThrow(
      UserNotFoundError,
    )
  })
})
