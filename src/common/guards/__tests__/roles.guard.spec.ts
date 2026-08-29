import { RolesGuard } from '../roles.guard'
import { Role } from '../../constants/roles'
import type { UserAccessPort } from '../../ports/user-access.port'
import { Reflector } from '@nestjs/core'
import { ForbiddenException } from '@nestjs/common'
import type { ExecutionContext } from '@nestjs/common'

function createContext(user: { roles: string[]; permissions: string[] }) {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext
}

describe('RolesGuard', () => {
  let access: jest.Mocked<UserAccessPort>
  let guard: RolesGuard
  const reflector = { getAllAndOverride: jest.fn() } as unknown as Reflector

  beforeEach(() => {
    access = { resolveAccess: jest.fn() }
    guard = new RolesGuard(reflector, access)
  })

  it('permite acesso sem metadata de role/permission', async () => {
    ;(reflector.getAllAndOverride as jest.Mock).mockReturnValue(undefined)
    const ctx = createContext({ roles: [], permissions: [] })

    await expect(guard.canActivate(ctx)).resolves.toBe(true)
  })

  it('permite quando o usuário tem a role exigida', async () => {
    ;(reflector.getAllAndOverride as jest.Mock)
      .mockReturnValueOnce(['ADMIN']) // roles
      .mockReturnValueOnce(undefined) // permissions
    const ctx = createContext({ roles: ['ADMIN'], permissions: [] })

    await expect(guard.canActivate(ctx)).resolves.toBe(true)
  })

  it('permite quando o usuário tem a permissão exigida', async () => {
    ;(reflector.getAllAndOverride as jest.Mock)
      .mockReturnValueOnce(undefined)
      .mockReturnValueOnce(['user:read'])
    const ctx = createContext({ roles: ['ADMIN'], permissions: ['user:read'] })

    await expect(guard.canActivate(ctx)).resolves.toBe(true)
  })

  it('SUPER_ADMIN ignora qualquer exigência', async () => {
    ;(reflector.getAllAndOverride as jest.Mock)
      .mockReturnValueOnce(['ADMIN'])
      .mockReturnValueOnce(['role:manage'])
    const ctx = createContext({
      roles: [Role.SUPER_ADMIN],
      permissions: [],
    })

    await expect(guard.canActivate(ctx)).resolves.toBe(true)
  })

  it('nega quando falta a role e a permissão', async () => {
    ;(reflector.getAllAndOverride as jest.Mock)
      .mockReturnValueOnce(['ADMIN'])
      .mockReturnValueOnce(['user:write'])
    const ctx = createContext({
      roles: ['USER'],
      permissions: ['user:read'],
    })

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException)
  })
})
