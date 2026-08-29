import { Global, Module } from '@nestjs/common'
import { TEMPORARY_TOKEN_STORE_PORT } from '../../common/ports/temporary-token-store.port'
import { RedisTemporaryTokenStore } from './redis-temporary-token.store'

/**
 * Provê o armazenamento de tokens temporários atrás da porta
 * `TEMPORARY_TOKEN_STORE_PORT`. Global — usado por users e auth.
 */
@Global()
@Module({
  providers: [
    RedisTemporaryTokenStore,
    {
      provide: TEMPORARY_TOKEN_STORE_PORT,
      useExisting: RedisTemporaryTokenStore,
    },
  ],
  exports: [TEMPORARY_TOKEN_STORE_PORT],
})
export class TemporaryTokenStoreModule {}
