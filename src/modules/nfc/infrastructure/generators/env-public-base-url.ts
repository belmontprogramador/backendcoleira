import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { PublicBaseUrlPort } from '../../domain/services/public-base-url.port'

/**
 * Implementação da base URL pública via `ConfigService`.
 * O fallback cobre dev/teste (mesmo comportamento anterior com `process.env`).
 */
@Injectable()
export class EnvPublicBaseUrl implements PublicBaseUrlPort {
  constructor(private readonly config: ConfigService) {}

  buildProfileUrl(publicId: string): string {
    const base =
      this.config.get<string>('PUBLIC_BASE_URL') ?? 'https://elopet.online'
    return `${base}/p/${publicId}`
  }
}
