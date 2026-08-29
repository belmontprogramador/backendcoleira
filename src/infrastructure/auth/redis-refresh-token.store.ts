import { Injectable } from '@nestjs/common'
import type { RefreshTokenStorePort } from '../../common/ports/refresh-token-store.port'
import { RedisService } from '../cache/redis.service'

const TOKEN_PREFIX = 'refresh:token:'
const USER_INDEX_PREFIX = 'refresh:user:'

/**
 * Implementação do armazenamento de refresh tokens sobre Redis.
 *
 * Estratégia:
 *   - `refresh:token:<jti>` → userId (string), com TTL = vida do refresh token.
 *   - `refresh:user:<userId>` → SET com todos os `jti` ativos do usuário,
 *     para permitir revogação em cadeia (roubo detectado) em O(n).
 */
@Injectable()
export class RedisRefreshTokenStore implements RefreshTokenStorePort {
  constructor(private readonly redis: RedisService) {}

  async save(
    tokenId: string,
    userId: string,
    ttlSeconds: number,
  ): Promise<void> {
    await this.redis.set(`${TOKEN_PREFIX}${tokenId}`, userId, ttlSeconds)
    await this.redis.sadd(`${USER_INDEX_PREFIX}${userId}`, tokenId)
  }

  async isValid(tokenId: string): Promise<boolean> {
    const value = await this.redis.get(`${TOKEN_PREFIX}${tokenId}`)
    return value !== null
  }

  async revoke(tokenId: string): Promise<void> {
    // Remove o token e também do índice do usuário, se conhecermos o dono.
    const userId = await this.redis.get(`${TOKEN_PREFIX}${tokenId}`)
    if (userId !== null) {
      await this.redis.srem(`${USER_INDEX_PREFIX}${userId}`, tokenId)
    }
    await this.redis.del(`${TOKEN_PREFIX}${tokenId}`)
  }

  async revokeAllForUser(userId: string): Promise<void> {
    const tokenIds = await this.redis.smembers(`${USER_INDEX_PREFIX}${userId}`)
    for (const tokenId of tokenIds) {
      await this.redis.del(`${TOKEN_PREFIX}${tokenId}`)
    }
    await this.redis.del(`${USER_INDEX_PREFIX}${userId}`)
  }
}
