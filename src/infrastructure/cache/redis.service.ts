import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Redis from 'ioredis'

/**
 * Implementação concreta da porta de cache usando ioredis.
 *
 * DIP: o restante da aplicação depende de `CachePort`; esta classe é a
 * implementação plugável na camada de infraestrutura.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name)
  private readonly client: Redis

  constructor(config: ConfigService) {
    const url = config.getOrThrow<string>('REDIS_URL')
    this.client = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => Math.min(times * 200, 2000),
    })

    this.client.on('error', (err: Error) => {
      this.logger.error(`Redis connection error: ${err.message}`, err.stack)
    })
  }

  async onModuleInit(): Promise<void> {
    await this.client.connect()
    this.logger.log('Redis connected')
  }

  async onModuleDestroy(): Promise<void> {
    await this.quit()
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key)
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds !== undefined) {
      await this.client.set(key, value, 'EX', ttlSeconds)
      return
    }
    await this.client.set(key, value)
  }

  async del(key: string): Promise<void> {
    await this.client.del(key)
  }

  async ping(): Promise<string> {
    return this.client.ping()
  }

  async quit(): Promise<void> {
    await this.client.quit()
  }

  // ── operações de conjunto (usadas pelo refresh-token store) ──────────────

  async sadd(key: string, member: string): Promise<number> {
    return this.client.sadd(key, member)
  }

  async smembers(key: string): Promise<string[]> {
    return this.client.smembers(key)
  }

  async srem(key: string, member: string): Promise<number> {
    return this.client.srem(key, member)
  }
}
