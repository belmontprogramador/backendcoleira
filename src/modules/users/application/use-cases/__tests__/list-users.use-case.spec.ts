import { ListUsersUseCase } from '../list-users.use-case'
import type { UserRepositoryPort } from '../../../domain/repositories/user.repository.port'
import { User } from '../../../domain/entities/user.entity'
import { Email } from '../../../domain/value-objects/email.vo'

describe('ListUsersUseCase', () => {
  let users: jest.Mocked<UserRepositoryPort>
  let useCase: ListUsersUseCase

  beforeEach(() => {
    users = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      save: jest.fn(),
      list: jest.fn(),
      count: jest.fn(),
    }
    useCase = new ListUsersUseCase(users)
  })

  it('lista usuários paginados com total', async () => {
    const u1 = User.create({
      id: 'u1',
      name: 'A',
      email: Email.create('a@email.com'),
      passwordHash: 'x',
    })
    const u2 = User.create({
      id: 'u2',
      name: 'B',
      email: Email.create('b@email.com'),
      passwordHash: 'x',
    })
    users.list.mockResolvedValue([u1, u2])
    users.count.mockResolvedValue(42)

    const result = await useCase.execute({ page: 2, limit: 20 })

    expect(result).toEqual({
      data: [u1, u2],
      total: 42,
      page: 2,
      limit: 20,
    })
    expect(users.list).toHaveBeenCalledWith({
      page: 2,
      limit: 20,
      status: undefined,
    })
    expect(users.count).toHaveBeenCalledWith({
      page: 2,
      limit: 20,
      status: undefined,
    })
  })

  it('repassa o filtro de status para list e count', async () => {
    users.list.mockResolvedValue([])
    users.count.mockResolvedValue(0)

    await useCase.execute({ page: 1, limit: 10, status: 'ACTIVE' })

    expect(users.list).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      status: 'ACTIVE',
    })
    expect(users.count).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      status: 'ACTIVE',
    })
  })

  it('repassa o filtro de role para list e count', async () => {
    users.list.mockResolvedValue([])
    users.count.mockResolvedValue(0)

    await useCase.execute({
      page: 1,
      limit: 10,
      role: ['OPERATOR', 'ADMIN', 'NONE'],
    })

    expect(users.list).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      role: ['OPERATOR', 'ADMIN', 'NONE'],
    })
    expect(users.count).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      role: ['OPERATOR', 'ADMIN', 'NONE'],
    })
  })
})
