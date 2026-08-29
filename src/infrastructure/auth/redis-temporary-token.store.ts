import { Injectable } from '@nestjs/common'
import { randomBytes } from 'node:crypto'
import type { TemporaryTokenStorePort } from '../../common/ports/temporary-token-store.port'
import { RedisService } from '../cache/redis.service'

/**
 * Implementação do armazenamento de tokens temporários sobre Redis.
 * Usa `GET` + `DEL` atômico para garantir single-use.
 */
@Injectable()
export class RedisTemporaryTokenStore implements TemporaryTokenStorePort {
  constructor(private readonly redis: RedisService) {}

  async save(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.redis.set(key, value, ttlSeconds)
  }

  async consume(key: string): Promise<string | null> {
    const value = await this.redis.get(key)
    if (value !== null) {
      await this.redis.del(key)
    }
    return value
  }

  static generate(): string {
    return randomBytes(32).toString('hex')
  }
}
