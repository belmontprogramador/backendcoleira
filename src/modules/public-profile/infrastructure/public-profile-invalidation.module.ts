import { Global, Module } from '@nestjs/common'
import { PUBLIC_PROFILE_INVALIDATION_PORT } from '../../../common/ports/public-profile-invalidation.port'
import { NfcModule } from '../../nfc/nfc.module'
import { RedisPublicProfileInvalidation } from './redis-public-profile-invalidation'

/**
 * Provê a implementação concreta da invalidação do cache do perfil público
 * atrás da porta `PUBLIC_PROFILE_INVALIDATION_PORT`. Global por design — a
 * invalidação é transversal (consumida por pets e ownership).
 */
@Global()
@Module({
  imports: [NfcModule],
  providers: [
    RedisPublicProfileInvalidation,
    {
      provide: PUBLIC_PROFILE_INVALIDATION_PORT,
      useClass: RedisPublicProfileInvalidation,
    },
  ],
  exports: [PUBLIC_PROFILE_INVALIDATION_PORT],
})
export class PublicProfileInvalidationModule {}
