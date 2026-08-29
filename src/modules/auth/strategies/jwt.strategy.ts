import { Inject, Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { USER_ACCESS_PORT } from '../../../common/ports/user-access.port'
import type { UserAccessPort } from '../../../common/ports/user-access.port'

export interface JwtUser {
  sub: string
  email: string
  roles?: string[]
  permissions?: string[]
}

/**
 * Estratégia de validação do access token (JWT).
 * Carrega as roles/permissões do usuário para uso pelo RolesGuard.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    @Inject(USER_ACCESS_PORT) private readonly access: UserAccessPort,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    })
  }

  async validate(payload: JwtUser): Promise<JwtUser> {
    const resolved = await this.access.resolveAccess(payload.sub)
    if (!resolved) {
      throw new UnauthorizedException(
        'Usuário sem acesso (bloqueado, removido ou inexistente)',
      )
    }
    return {
      sub: payload.sub,
      email: payload.email,
      roles: resolved.roles,
      permissions: resolved.permissions,
    }
  }
}
