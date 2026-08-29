import 'dotenv/config'
import { ConfigService } from '@nestjs/config'
import { RedisService } from '../../cache/redis.service'
import { RedisRefreshTokenStore } from '../redis-refresh-token.store'

describe('RedisRefreshTokenStore (integração)', () => {
  let redis: RedisService
  let store: RedisRefreshTokenStore

  const config = {
    getOrThrow: (key: string) => {
      const map: Record<string, string> = {
        REDIS_URL: process.env.REDIS_URL ?? 'redis://localhost:6379',
      }
      return map[key]
    },
  } as unknown as ConfigService

  beforeAll(async () => {
    redis = new RedisService(config)
    await redis.onModuleInit()
    store = new RedisRefreshTokenStore(redis)
  })

  afterAll(async () => {
    await redis.quit()
  })

  it('salva um token e o reconhece como válido', async () => {
    await store.save('jti-1', 'u1', 60)
    await expect(store.isValid('jti-1')).resolves.toBe(true)
  })

  it('reconhece token inexistente como inválido', async () => {
    await expect(store.isValid('nao-existe')).resolves.toBe(false)
  })

  it('revoga um token individualmente', async () => {
    await store.save('jti-2', 'u1', 60)
    await store.revoke('jti-2')
    await expect(store.isValid('jti-2')).resolves.toBe(false)
  })

  it('revoga todos os tokens de um usuário (cadeia)', async () => {
    await store.save('jti-a', 'u2', 60)
    await store.save('jti-b', 'u2', 60)
    await store.save('jti-c', 'u3', 60)

    await store.revokeAllForUser('u2')

    await expect(store.isValid('jti-a')).resolves.toBe(false)
    await expect(store.isValid('jti-b')).resolves.toBe(false)
    // tokens de outros usuários permanecem
    await expect(store.isValid('jti-c')).resolves.toBe(true)
  })
})
