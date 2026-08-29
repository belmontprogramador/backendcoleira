import { UserResponseMapper } from '../user-response.mapper'
import { User } from '../../../domain/entities/user.entity'
import { Email } from '../../../domain/value-objects/email.vo'

describe('UserResponseMapper', () => {
  function makeUser(): User {
    return User.create({
      id: 'u1',
      name: 'João',
      email: Email.create('joao@email.com'),
      passwordHash: 'secret-hash',
      phone: '+5521999999999',
    })
  }

  it('mapeia User + roles + permissions para DTO seguro (camelCase)', () => {
    const user = makeUser()

    const response = UserResponseMapper.toResponse(
      user,
      ['ADMIN', 'OPERATOR'],
      ['user:read', 'user:write'],
    )

    expect(response).toEqual({
      id: 'u1',
      name: 'João',
      email: 'joao@email.com',
      phone: '+5521999999999',
      status: 'PENDING_VERIFICATION',
      emailVerifiedAt: null,
      createdAt: user.createdAt,
      roles: ['ADMIN', 'OPERATOR'],
      permissions: ['user:read', 'user:write'],
    })
  })

  it('nunca expõe hash de senha', () => {
    const user = makeUser()

    const response = UserResponseMapper.toResponse(user, [], [])

    expect(response).not.toHaveProperty('password_hash')
    expect(response).not.toHaveProperty('passwordHash')
  })

  it('usa arrays vazios quando usuário não tem role nem permissão', () => {
    const user = makeUser()

    const response = UserResponseMapper.toResponse(user, [], [])

    expect(response.roles).toEqual([])
    expect(response.permissions).toEqual([])
  })
})
