import { User } from '../user.entity'
import { Email } from '../../value-objects/email.vo'
import { UserAlreadyDeletedError, UserStatus } from '../user.entity'

describe('User (entidade/agregado)', () => {
  const email = () => Email.create('joao@email.com')

  it('cria um usuário com status PENDING_VERIFICATION', () => {
    const user = User.create({
      id: 'u1',
      name: 'João',
      email: email(),
      passwordHash: 'hash',
    })

    expect(user.status).toBe(UserStatus.PENDING_VERIFICATION)
    expect(user.emailVerifiedAt).toBeNull()
    expect(user.deletedAt).toBeNull()
  })

  it('marca o e-mail como verificado e ativa o usuário', () => {
    const user = User.create({
      id: 'u1',
      name: 'João',
      email: email(),
      passwordHash: 'hash',
    })

    user.verifyEmail()

    expect(user.status).toBe(UserStatus.ACTIVE)
    expect(user.emailVerifiedAt).not.toBeNull()
  })

  it('bloqueia um usuário', () => {
    const user = User.create({
      id: 'u1',
      name: 'João',
      email: email(),
      passwordHash: 'hash',
    })
    user.verifyEmail()

    user.block()

    expect(user.status).toBe(UserStatus.BLOCKED)
  })

  it('desativa a conta via soft delete', () => {
    const user = User.create({
      id: 'u1',
      name: 'João',
      email: email(),
      passwordHash: 'hash',
    })

    user.deactivate()

    expect(user.deletedAt).not.toBeNull()
    expect(user.status).toBe(UserStatus.INACTIVE)
  })

  it('reativa um usuário desativado (restore)', () => {
    const user = User.create({
      id: 'u1',
      name: 'João',
      email: email(),
      passwordHash: 'hash',
    })
    user.deactivate()

    user.restore()

    expect(user.status).toBe(UserStatus.ACTIVE)
    expect(user.deletedAt).toBeNull()
  })

  it('atualiza nome e telefone', () => {
    const user = User.create({
      id: 'u1',
      name: 'João',
      email: email(),
      passwordHash: 'hash',
    })

    user.updateProfile({ name: 'João Silva', phone: '+5521999999999' })

    expect(user.name).toBe('João Silva')
    expect(user.phone).toBe('+5521999999999')
  })

  it('lança erro ao operar sobre usuário já desativado', () => {
    const user = User.create({
      id: 'u1',
      name: 'João',
      email: email(),
      passwordHash: 'hash',
    })
    user.deactivate()

    expect(() => user.verifyEmail()).toThrow(UserAlreadyDeletedError)
    expect(() => user.updateProfile({ name: 'X' })).toThrow(
      UserAlreadyDeletedError,
    )
  })
})
