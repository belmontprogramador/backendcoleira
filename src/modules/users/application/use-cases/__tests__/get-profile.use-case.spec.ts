import { GetProfileUseCase } from '../get-profile.use-case'
import { UserNotFoundError } from '../../errors'
import type { UserRepositoryPort } from '../../../domain/repositories/user.repository.port'
import { User } from '../../../domain/entities/user.entity'
import { Email } from '../../../domain/value-objects/email.vo'

describe('GetProfileUseCase', () => {
  let users: jest.Mocked<UserRepositoryPort>
  let useCase: GetProfileUseCase

  beforeEach(() => {
    users = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      save: jest.fn(),
      list: jest.fn(),
      count: jest.fn(),
    }
    useCase = new GetProfileUseCase(users)
  })

  it('retorna o perfil do usuário', async () => {
    const user = User.create({
      id: 'u1',
      name: 'João',
      email: Email.create('joao@email.com'),
      passwordHash: 'hashed',
    })
    users.findById.mockResolvedValue(user)

    const result = await useCase.execute('u1')
    expect(result.id).toBe('u1')
  })

  it('lança UserNotFoundError se não existir', async () => {
    users.findById.mockResolvedValue(null)

    await expect(useCase.execute('nao-existe')).rejects.toThrow(
      UserNotFoundError,
    )
  })
})
