import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { randomUUID } from 'node:crypto'
import type {
  AccessTokenPayload,
  RefreshToken,
  RefreshTokenPayload,
  TokenServicePort,
} from '../../common/ports/token-service.port'

interface AccessClaims {
  sub: string
  email: string
  type: 'access'
}

interface RefreshClaims {
  sub: string
  email: string
  type: 'refresh'
  jti: string
}

/**
 * Implementação concreta do serviço de tokens usando @nestjs/jwt.
 */
@Injectable()
export class JwtTokenService implements TokenServicePort {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async signAccessToken(payload: {
    sub: string
    email: string
  }): Promise<string> {
    return this.jwt.signAsync(
      { ...payload, type: 'access' } satisfies AccessClaims,
      {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.getOrThrow<number>('JWT_ACCESS_TTL'),
      },
    )
  }

  async signRefreshToken(payload: {
    sub: string
    email: string
  }): Promise<RefreshToken> {
    const jti = randomUUID()
    const token = await this.jwt.signAsync(
      { ...payload, type: 'refresh', jti } satisfies RefreshClaims,
      {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.getOrThrow<number>('JWT_REFRESH_TTL'),
      },
    )
    return { token, jti }
  }

  async verifyAccess(token: string): Promise<AccessTokenPayload> {
    const payload = await this.jwt.verifyAsync<AccessClaims>(token, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    })
    if (payload.type !== 'access') {
      throw new Error('Token não é do tipo access')
    }
    return payload
  }

  async verifyRefresh(token: string): Promise<RefreshTokenPayload> {
    const payload = await this.jwt.verifyAsync<RefreshClaims>(token, {
      secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
    })
    if (payload.type !== 'refresh' || !payload.jti) {
      throw new Error('Token não é do tipo refresh')
    }
    return payload
  }
}
