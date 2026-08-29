import { FeatureGuard } from '../feature.guard'
import type { FeatureAccessPort } from '../../ports/feature-access.port'
import { Reflector } from '@nestjs/core'
import { ForbiddenException } from '@nestjs/common'
import type { ExecutionContext } from '@nestjs/common'

function createContext(user?: { sub: string }) {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext
}

describe('FeatureGuard', () => {
  let featureAccess: jest.Mocked<FeatureAccessPort>
  let guard: FeatureGuard
  const reflector = { getAllAndOverride: jest.fn() } as unknown as Reflector

  beforeEach(() => {
    featureAccess = { hasFeature: jest.fn(), listFeatures: jest.fn() }
    guard = new FeatureGuard(reflector, featureAccess)
  })

  it('permite sem metadata de feature', async () => {
    ;(reflector.getAllAndOverride as jest.Mock).mockReturnValue(undefined)
    await expect(guard.canActivate(createContext())).resolves.toBe(true)
  })

  it('permite quando o usuário tem a feature', async () => {
    ;(reflector.getAllAndOverride as jest.Mock).mockReturnValue(['PET_MEDICAL'])
    featureAccess.hasFeature.mockResolvedValue(true)

    await expect(
      guard.canActivate(createContext({ sub: 'user-1' })),
    ).resolves.toBe(true)
    expect(featureAccess.hasFeature).toHaveBeenCalledWith(
      'user-1',
      'PET_MEDICAL',
    )
  })

  it('nega (403) quando falta a feature', async () => {
    ;(reflector.getAllAndOverride as jest.Mock).mockReturnValue(['PET_MEDICAL'])
    featureAccess.hasFeature.mockResolvedValue(false)

    await expect(
      guard.canActivate(createContext({ sub: 'user-1' })),
    ).rejects.toThrow(ForbiddenException)
  })

  it('nega (403) sem usuário autenticado', async () => {
    ;(reflector.getAllAndOverride as jest.Mock).mockReturnValue(['PET_MEDICAL'])

    await expect(guard.canActivate(createContext())).rejects.toThrow(
      ForbiddenException,
    )
  })
})
