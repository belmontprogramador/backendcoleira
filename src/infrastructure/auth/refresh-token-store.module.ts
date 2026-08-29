import { Global, Module } from '@nestjs/common'
import { REFRESH_TOKEN_STORE_PORT } from '../../common/ports/refresh-token-store.port'
import { RedisRefreshTokenStore } from './redis-refresh-token.store'

/**
 * Provê o armazenamento de refresh tokens atrás da porta
 * `REFRESH_TOKEN_STORE_PORT`. Global — usado por auth (login/refresh) e por
 * casos de uso de credenciais (reset de senha por admin, que revoga sessões).
 */
@Global()
@Module({
  providers: [
    RedisRefreshTokenStore,
    {
      provide: REFRESH_TOKEN_STORE_PORT,
      useExisting: RedisRefreshTokenStore,
    },
  ],
  exports: [REFRESH_TOKEN_STORE_PORT],
})
export class RefreshTokenStoreModule {}
