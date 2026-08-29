import { ConfigService } from '@nestjs/config'
import { createHash } from 'node:crypto'
import { Sha256IpHasher } from '../sha256-ip.hasher'

describe('Sha256IpHasher', () => {
  function makeConfig(salt: string | undefined): ConfigService {
    return {
      getOrThrow: () => {
        if (!salt) {
          throw new Error('Missing key: IP_HASH_SALT')
        }
        return salt
      },
    } as unknown as ConfigService
  }

  it('retorna null para IP ausente', () => {
    const hasher = new Sha256IpHasher(makeConfig('meu-salt'))

    expect(hasher.hash(undefined)).toBeNull()
  })

  it('gera SHA-256 do IP com o salt configurado', () => {
    const hasher = new Sha256IpHasher(makeConfig('meu-salt'))
    const expected = createHash('sha256')
      .update('192.168.0.1:meu-salt')
      .digest('hex')

    expect(hasher.hash('192.168.0.1')).toBe(expected)
  })

  it('falha (sem fallback) quando IP_HASH_SALT não está configurado', () => {
    const hasher = new Sha256IpHasher(makeConfig(undefined))

    expect(() => hasher.hash('192.168.0.1')).toThrow(
      'Missing key: IP_HASH_SALT',
    )
  })
})
