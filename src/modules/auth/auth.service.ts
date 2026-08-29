import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PASSWORD_HASHER_PORT } from '../../common/ports/password-hasher.port'
import type { PasswordHasherPort } from '../../common/ports/password-hasher.port'
import { REFRESH_TOKEN_STORE_PORT } from '../../common/ports/refresh-token-store.port'
import type { RefreshTokenStorePort } from '../../common/ports/refresh-token-store.port'
import { TOKEN_SERVICE_PORT } from '../../common/ports/token-service.port'
import type {
  RefreshTokenPayload,
  TokenServicePort,
} from '../../common/ports/token-service.port'
import { AUDIT_LOGGER_PORT } from '../../common/ports/audit-logger.port'
import type { AuditLoggerPort } from '../../common/ports/audit-logger.port'
import { USER_REPOSITORY_PORT } from '../users/domain/repositories/user.repository.port'
import type { UserRepositoryPort } from '../users/domain/repositories/user.repository.port'
import { UserStatus } from '../users/domain/entities/user.entity'
import { InvalidCredentialsError, InvalidRefreshTokenError } from './errors'

export interface LoginInput {
  email: string
  password: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

/**
 * Casos de uso de autenticação: login, refresh (com rotação) e logout.
 *
 * DIP: depende apenas de portas (interfaces), nunca de implementações
 * concretas de bcrypt/JWT/Redis.
 *
 * Auditoria (doc-sistema RF34/RB28): login, logout, refresh e falhas de
 * login/refresh são registrados via `AuditLoggerPort`.
 */
@Injectable()
export class AuthService {
  constructor(
    @Inject(USER_REPOSITORY_PORT) private readonly users: UserRepositoryPort,
    @Inject(PASSWORD_HASHER_PORT) private readonly hasher: PasswordHasherPort,
    @Inject(TOKEN_SERVICE_PORT) private readonly tokens: TokenServicePort,
    @Inject(REFRESH_TOKEN_STORE_PORT)
    private readonly refreshStore: RefreshTokenStorePort,
    @Inject(AUDIT_LOGGER_PORT) private readonly audit: AuditLoggerPort,
    private readonly config: ConfigService,
  ) {}

  async login(input: LoginInput): Promise<AuthTokens> {
    const email = input.email.toLowerCase()
    const user = await this.users.findByEmail(email)
    if (
      !user ||
      user.deletedAt !== null ||
      user.status === UserStatus.BLOCKED
    ) {
      await this.audit.log({
        action: 'login_failed',
        entity: 'auth',
        metadata: { email, reason: 'invalid_credentials' },
      })
      throw new InvalidCredentialsError()
    }

    const passwordMatches = await this.hasher.compare(
      input.password,
      user.passwordHash,
    )
    if (!passwordMatches) {
      await this.audit.log({
        action: 'login_failed',
        entity: 'auth',
        metadata: { email, reason: 'invalid_credentials' },
      })
      throw new InvalidCredentialsError()
    }

    user.registerLogin()
    await this.users.save(user)

    await this.audit.log({
      userId: user.id,
      action: 'login',
      entity: 'auth',
      metadata: { email },
    })

    return this.issueTokens(user.id, user.email.value)
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload: RefreshTokenPayload
    try {
      payload = await this.tokens.verifyRefresh(refreshToken)
    } catch {
      throw new InvalidRefreshTokenError()
    }

    const stillValid = await this.refreshStore.isValid(payload.jti)
    if (!stillValid) {
      // Reuso detectado → revoga toda a cadeia do usuário (roubo provável).
      await this.refreshStore.revokeAllForUser(payload.sub)
      await this.audit.log({
        action: 'token_reuse_detected',
        entity: 'auth',
        metadata: { sub: payload.sub },
      })
      throw new InvalidRefreshTokenError()
    }

    // Bloqueio/desativação invalida qualquer refresh token em circulação.
    const user = await this.users.findById(payload.sub)
    if (
      !user ||
      user.deletedAt !== null ||
      user.status === UserStatus.BLOCKED
    ) {
      await this.refreshStore.revokeAllForUser(payload.sub)
      throw new InvalidRefreshTokenError()
    }

    // Rotação single-use: invalida o token usado e emite um novo par.
    await this.refreshStore.revoke(payload.jti)

    await this.audit.log({
      userId: payload.sub,
      action: 'token_refresh',
      entity: 'auth',
    })

    return this.issueTokens(payload.sub, payload.email)
  }

  async logout(refreshToken: string): Promise<void> {
    let payload: RefreshTokenPayload
    try {
      payload = await this.tokens.verifyRefresh(refreshToken)
    } catch {
      return
    }

    await this.refreshStore.revoke(payload.jti)
    await this.audit.log({
      userId: payload.sub,
      action: 'logout',
      entity: 'auth',
    })
  }

  private async issueTokens(sub: string, email: string): Promise<AuthTokens> {
    const accessToken = await this.tokens.signAccessToken({ sub, email })
    const refresh = await this.tokens.signRefreshToken({ sub, email })

    // O TTL do refresh token no store deve bater com o do JWT.
    await this.refreshStore.save(
      refresh.jti,
      sub,
      this.config.getOrThrow<number>('JWT_REFRESH_TTL'),
    )

    return { accessToken, refreshToken: refresh.token }
  }
}
