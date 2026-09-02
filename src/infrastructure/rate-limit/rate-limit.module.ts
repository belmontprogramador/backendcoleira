import { ExecutionContext, Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ConfigService } from '@nestjs/config'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis'

/**
 * Rate limiting global com storage Redis (multi-instância).
 *
 * - `default`: 10 requisições / minuto por IP (todas as rotas).
 * - `contact-ip`: 5 / hora por IP — só na rota `POST /p/:publicId/contact`.
 * - `contact-publicId`: 10 / hora por publicId — idem (anti-flood do tutor).
 *
 * Os throttlers de contato usam `skipIf` seletivo para ativar APENAS na rota
 * de contato (identificada por method `POST` + param `publicId` presente).
 */
export function isContactRoute(context: ExecutionContext): boolean {
  const req = context.switchToHttp().getRequest<{
    method?: string
    originalUrl?: string
    url?: string
  }>()
  if (req.method !== 'POST') {
    return false
  }
  const path = (req.originalUrl ?? req.url ?? '').split('?')[0]
  return /\/p\/[^/]+\/contact$/.test(path)
}

interface ContactIpRequest {
  ip?: string
}

interface ContactPublicIdRequest {
  params?: Record<string, string>
}

function contactIpTracker(req: ContactIpRequest): string {
  return req.ip ?? 'unknown'
}

function contactPublicIdTracker(req: ContactPublicIdRequest): string {
  return (req.params?.publicId ?? '').toUpperCase()
}

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            name: 'default',
            ttl: 60000, // 60s
            limit: 10, // 10 requisições
          },
          {
            name: 'contact-ip',
            ttl: 3600000, // 1h
            limit: 5, // 5 por IP
            getTracker: contactIpTracker,
            skipIf: (context: ExecutionContext): boolean =>
              !isContactRoute(context),
          },
          {
            name: 'contact-publicId',
            ttl: 3600000, // 1h
            limit: 10, // 10 por publicId
            getTracker: contactPublicIdTracker,
            skipIf: (context: ExecutionContext): boolean =>
              !isContactRoute(context),
          },
        ],
        storage: new ThrottlerStorageRedisService(
          config.getOrThrow<string>('REDIS_URL'),
        ),
      }),
    }),
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class RateLimitModule {}
