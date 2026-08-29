import { ChangePasswordUseCase } from '../change-password.use-case'
import { UserNotFoundError, IncorrectPasswordError } from '../../errors'
import type { UserRepositoryPort } from '../../../domain/repositories/user.repository.port'
import type { PasswordHasherPort } from '../../../../../common/ports/password-hasher.port'
import { User } from '../../../domain/entities/user.entity'
import { Email } from '../../../domain/value-objects/email.vo'

describe('ChangePasswordUseCase', () => {
  let users: jest.Mocked<UserRepositoryPort>
  let hasher: jest.Mocked<PasswordHasherPort>
  let useCase: ChangePasswordUseCase

  beforeEach(() => {
    users = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      save: jest.fn(),
      list: jest.fn(),
      count: jest.fn(),
    }
    hasher = { hash: jest.fn(), compare: jest.fn() }
    useCase = new ChangePasswordUseCase(users, hasher)
  })

  it('altera a senha quando a senha atual confere', async () => {
    const user = User.create({
      id: 'u1',
      name: 'João',
      email: Email.create('joao@email.com'),
      passwordHash: 'old-hash',
    })
    users.findById.mockResolvedValue(user)
    hasher.compare.mockResolvedValue(true)
    hasher.hash.mockResolvedValue('new-hash')

    await useCase.execute('u1', 'senhaAtual', 'novaSenha123')

    expect(hasher.compare).toHaveBeenCalledWith('senhaAtual', 'old-hash')
    expect(hasher.hash).toHaveBeenCalledWith('novaSenha123')
    expect(users.save).toHaveBeenCalled()
    expect(user.passwordHash).toBe('new-hash')
  })

  it('rejeita senha atual incorreta', async () => {
    const user = User.create({
      id: 'u1',
      name: 'João',
      email: Email.create('joao@email.com'),
      passwordHash: 'old-hash',
    })
    users.findById.mockResolvedValue(user)
    hasher.compare.mockResolvedValue(false)

    await expect(
      useCase.execute('u1', 'senhaErrada', 'novaSenha123'),
    ).rejects.toThrow(IncorrectPasswordError)
  })

  it('lança UserNotFoundError se não existir', async () => {
    users.findById.mockResolvedValue(null)

    await expect(
      useCase.execute('nao-existe', 'atual', 'novaSenha123'),
    ).rejects.toThrow(UserNotFoundError)
  })
})
