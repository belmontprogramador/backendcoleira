import { UserResponseAssembler } from '../user-response.assembler'
import type { RoleRepositoryPort } from '../../../domain/repositories/role.repository.port'
import { User } from '../../../domain/entities/user.entity'
import { Email } from '../../../domain/value-objects/email.vo'

describe('UserResponseAssembler', () => {
  let roles: jest.Mocked<RoleRepositoryPort>
  let assembler: UserResponseAssembler

  beforeEach(() => {
    roles = {
      findByName: jest.fn(),
      setRole: jest.fn(),
      findRolesByUserIds: jest.fn(),
      findPermissionsByUserIds: jest.fn(),
    }
    assembler = new UserResponseAssembler(roles)
  })

  function makeUser(id: string): User {
    return User.create({
      id,
      name: `User ${id}`,
      email: Email.create(`${id}@email.com`),
      passwordHash: 'x',
    })
  }

  it('resolve roles e permissões de um único usuário', async () => {
    const user = makeUser('u1')
    roles.findRolesByUserIds.mockResolvedValue(new Map([['u1', ['ADMIN']]]))
    roles.findPermissionsByUserIds.mockResolvedValue(
      new Map([['u1', ['user:read', 'user:write']]]),
    )

    const result = await assembler.assemble(user)

    expect(roles.findRolesByUserIds).toHaveBeenCalledWith(['u1'])
    expect(roles.findPermissionsByUserIds).toHaveBeenCalledWith(['u1'])
    expect(result.roles).toEqual(['ADMIN'])
    expect(result.permissions).toEqual(['user:read', 'user:write'])
    expect(result.id).toBe('u1')
  })

  it('resolve roles e permissões em lote com uma consulta cada (sem N+1)', async () => {
    const u1 = makeUser('u1')
    const u2 = makeUser('u2')
    roles.findRolesByUserIds.mockResolvedValue(
      new Map([
        ['u1', ['ADMIN']],
        ['u2', []],
      ]),
    )
    roles.findPermissionsByUserIds.mockResolvedValue(
      new Map([
        ['u1', ['user:read']],
        ['u2', []],
      ]),
    )

    const result = await assembler.assembleMany([u1, u2])

    expect(roles.findRolesByUserIds).toHaveBeenCalledWith(['u1', 'u2'])
    expect(roles.findPermissionsByUserIds).toHaveBeenCalledWith(['u1', 'u2'])
    expect(result).toHaveLength(2)
    expect(result[0].roles).toEqual(['ADMIN'])
    expect(result[0].permissions).toEqual(['user:read'])
    expect(result[1].roles).toEqual([])
    expect(result[1].permissions).toEqual([])
  })

  it('retorna array vazio para lista vazia sem consultar roles/permissões', async () => {
    const result = await assembler.assembleMany([])

    expect(result).toEqual([])
    expect(roles.findRolesByUserIds).not.toHaveBeenCalled()
    expect(roles.findPermissionsByUserIds).not.toHaveBeenCalled()
  })
})
