import { UpdateProfileUseCase } from '../update-profile.use-case'
import { UserNotFoundError } from '../../errors'
import type { UserRepositoryPort } from '../../../domain/repositories/user.repository.port'
import { User } from '../../../domain/entities/user.entity'
import { Email } from '../../../domain/value-objects/email.vo'

describe('UpdateProfileUseCase', () => {
  let users: jest.Mocked<UserRepositoryPort>
  let useCase: UpdateProfileUseCase

  beforeEach(() => {
    users = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      save: jest.fn(),
      list: jest.fn(),
      count: jest.fn(),
    }
    useCase = new UpdateProfileUseCase(users)
  })

  it('atualiza nome e telefone do usuário', async () => {
    const user = User.create({
      id: 'u1',
      name: 'João',
      email: Email.create('joao@email.com'),
      passwordHash: 'hashed',
    })
    users.findById.mockResolvedValue(user)

    const result = await useCase.execute('u1', {
      name: 'João Silva',
      phone: '+5521999999999',
    })

    expect(result.name).toBe('João Silva')
    expect(result.phone).toBe('+5521999999999')
    expect(users.save).toHaveBeenCalled()
  })

  it('lança UserNotFoundError se não existir', async () => {
    users.findById.mockResolvedValue(null)

    await expect(useCase.execute('nao-existe', { name: 'X' })).rejects.toThrow(
      UserNotFoundError,
    )
  })
})
