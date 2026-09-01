import { ConfigService } from '@nestjs/config'
import { EnvPublicBaseUrl } from '../env-public-base-url'

describe('EnvPublicBaseUrl', () => {
  function makeConfig(value: string | undefined): ConfigService {
    return {
      get: () => value,
    } as unknown as ConfigService
  }

  it('monta a URL a partir de PUBLIC_BASE_URL', () => {
    const service = new EnvPublicBaseUrl(makeConfig('https://app.coleira.com'))

    expect(service.buildProfileUrl('7F4K9M2Q')).toBe(
      'https://app.coleira.com/p/7F4K9M2Q',
    )
  })

  it('usa fallback quando PUBLIC_BASE_URL não está configurado', () => {
    const service = new EnvPublicBaseUrl(makeConfig(undefined))

    expect(service.buildProfileUrl('7F4K9M2Q')).toBe(
      'https://elopet.online/p/7F4K9M2Q',
    )
  })
})
