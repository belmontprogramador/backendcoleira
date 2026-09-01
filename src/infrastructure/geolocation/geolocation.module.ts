import { Global, Module } from '@nestjs/common'
import { IP_GEOLOCATION_PORT } from '../../common/ports/ip-geolocation.port'
import { IpapiGeolocationService } from './ipapi-geolocation.service'

/**
 * Provê a geolocalização por IP atrás da porta `IP_GEOLOCATION_PORT`.
 * Global — usado pelo perfil público (scan) e pelo envio de contato.
 */
@Global()
@Module({
  providers: [
    IpapiGeolocationService,
    { provide: IP_GEOLOCATION_PORT, useClass: IpapiGeolocationService },
  ],
  exports: [IP_GEOLOCATION_PORT],
})
export class GeolocationModule {}
