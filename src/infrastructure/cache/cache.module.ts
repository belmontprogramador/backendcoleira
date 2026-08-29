import { Global, Module } from '@nestjs/common'
import { CACHE_PORT } from '../../common/ports/cache.port'
import { RedisService } from './redis.service'

/**
 * Provê a implementação concreta do cache (ioredis) atrás da porta
 * `CACHE_PORT`. Global por design — cache é um serviço transversal.
 */
@Global()
@Module({
  providers: [RedisService, { provide: CACHE_PORT, useExisting: RedisService }],
  exports: [CACHE_PORT, RedisService],
})
export class CacheModule {}
