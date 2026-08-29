import { DeactivateAccountUseCase } from '../deactivate-account.use-case'
import { UserNotFoundError } from '../../errors'
import type { UserRepositoryPort } from '../../../domain/repositories/user.repository.port'
import { User } from '../../../domain/entities/user.entity'
import { Email } from '../../../domain/value-objects/email.vo'

describe('DeactivateAccountUseCase', () => {
  let users: jest.Mocked<UserRepositoryPort>
  let useCase: DeactivateAccountUseCase

  beforeEach(() => {
    users = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      save: jest.fn(),
      list: jest.fn(),
      count: jest.fn(),
    }
    useCase = new DeactivateAccountUseCase(users)
  })

  it('desativa a conta (soft delete)', async () => {
    const user = User.create({
      id: 'u1',
      name: 'João',
      email: Email.create('joao@email.com'),
      passwordHash: 'hashed',
    })
    users.findById.mockResolvedValue(user)

    await useCase.execute('u1')

    expect(user.deletedAt).not.toBeNull()
    expect(user.status).toBe('INACTIVE')
    expect(users.save).toHaveBeenCalled()
  })

  it('lança UserNotFoundError se não existir', async () => {
    users.findById.mockResolvedValue(null)

    await expect(useCase.execute('nao-existe')).rejects.toThrow(
      UserNotFoundError,
    )
  })
})
