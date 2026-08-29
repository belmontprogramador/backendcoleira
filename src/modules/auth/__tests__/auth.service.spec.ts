import { AuthService } from '../auth.service'
import type { ConfigService } from '@nestjs/config'
import type { PasswordHasherPort } from '../../../common/ports/password-hasher.port'
import type { TokenServicePort } from '../../../common/ports/token-service.port'
import type { RefreshTokenStorePort } from '../../../common/ports/refresh-token-store.port'
import type { AuditLoggerPort } from '../../../common/ports/audit-logger.port'
import type { UserRepositoryPort } from '../../users/domain/repositories/user.repository.port'
import { User } from '../../users/domain/entities/user.entity'
import { Email } from '../../users/domain/value-objects/email.vo'

describe('AuthService (casos de uso de autenticação)', () => {
  let users: jest.Mocked<UserRepositoryPort>
  let hasher: jest.Mocked<PasswordHasherPort>
  let tokens: jest.Mocked<TokenServicePort>
  let refreshStore: jest.Mocked<RefreshTokenStorePort>
  let audit: jest.Mocked<AuditLoggerPort>
  let service: AuthService

  const user = () =>
    User.create({
      id: 'u1',
      name: 'João',
      email: Email.create('joao@email.com'),
      passwordHash: 'hashed',
    })

  beforeEach(() => {
    users = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      save: jest.fn(),
      list: jest.fn(),
      count: jest.fn(),
    }
    hasher = {
      hash: jest.fn(),
      compare: jest.fn(),
    }
    tokens = {
      signAccessToken: jest.fn(),
      signRefreshToken: jest.fn(),
      verifyAccess: jest.fn(),
      verifyRefresh: jest.fn(),
    }
    refreshStore = {
      save: jest.fn(),
      isValid: jest.fn(),
      revoke: jest.fn(),
      revokeAllForUser: jest.fn(),
    }
    audit = {
      log: jest.fn().mockResolvedValue(undefined),
    }
    const config = {
      getOrThrow: jest.fn().mockReturnValue(604800),
    } as unknown as ConfigService
    service = new AuthService(
      users,
      hasher,
      tokens,
      refreshStore,
      audit,
      config,
    )
  })

  describe('login', () => {
    it('autentica com credenciais válidas e emite tokens', async () => {
      users.findByEmail.mockResolvedValue(user())
      hasher.compare.mockResolvedValue(true)
      tokens.signAccessToken.mockResolvedValue('access-token')
      tokens.signRefreshToken.mockResolvedValue({
        token: 'refresh-token',
        jti: 'jti-1',
      })

      const result = await service.login({
        email: 'joao@email.com',
        password: 'senha123',
      })

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      })
      expect(users.findByEmail).toHaveBeenCalledWith('joao@email.com')
      expect(refreshStore.save).toHaveBeenCalledWith(
        'jti-1',
        'u1',
        expect.any(Number),
      )
      // login registra o evento (last_login_at) e persiste
      expect(users.save).toHaveBeenCalled()
    })

    it('rejeita email inexistente', async () => {
      users.findByEmail.mockResolvedValue(null)

      await expect(
        service.login({ email: 'x@email.com', password: 'senha123' }),
      ).rejects.toThrow('Credenciais inválidas')
    })

    it('rejeita senha incorreta', async () => {
      users.findByEmail.mockResolvedValue(user())
      hasher.compare.mockResolvedValue(false)

      await expect(
        service.login({ email: 'joao@email.com', password: 'errada' }),
      ).rejects.toThrow('Credenciais inválidas')
    })

    it('rejeita usuário bloqueado (BLOCKED)', async () => {
      const blocked = user()
      blocked.block()
      users.findByEmail.mockResolvedValue(blocked)
      hasher.compare.mockResolvedValue(true)

      await expect(
        service.login({ email: 'joao@email.com', password: 'senha123' }),
      ).rejects.toThrow('Credenciais inválidas')
    })
  })

  describe('refresh', () => {
    it('rotaciona refresh token válido e emite novo par', async () => {
      tokens.verifyRefresh.mockResolvedValue({
        sub: 'u1',
        email: 'joao@email.com',
        type: 'refresh',
        jti: 'jti-1',
      })
      refreshStore.isValid.mockResolvedValue(true)
      users.findById.mockResolvedValue(user())
      tokens.signAccessToken.mockResolvedValue('new-access')
      tokens.signRefreshToken.mockResolvedValue({
        token: 'new-refresh',
        jti: 'jti-2',
      })

      const result = await service.refresh('refresh-token-antigo')

      expect(result).toEqual({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
      })
      // rotação: revoga o token antigo e salva o novo
      expect(refreshStore.revoke).toHaveBeenCalledWith('jti-1')
      expect(refreshStore.save).toHaveBeenCalledWith(
        'jti-2',
        'u1',
        expect.any(Number),
      )
    })

    it('revoga toda a cadeia ao detectar reuso de token já rotacionado', async () => {
      tokens.verifyRefresh.mockResolvedValue({
        sub: 'u1',
        email: 'joao@email.com',
        type: 'refresh',
        jti: 'jti-1',
      })
      refreshStore.isValid.mockResolvedValue(false)

      await expect(
        service.refresh('refresh-token-reutilizado'),
      ).rejects.toThrow('Refresh token inválido')

      expect(refreshStore.revokeAllForUser).toHaveBeenCalledWith('u1')
    })

    it('rejeita token que não é do tipo refresh', async () => {
      tokens.verifyRefresh.mockRejectedValue(new Error('não é refresh'))

      await expect(service.refresh('access-token')).rejects.toThrow(
        'Refresh token inválido',
      )
    })

    it('rejeita refresh de usuário bloqueado (BLOCKED)', async () => {
      tokens.verifyRefresh.mockResolvedValue({
        sub: 'u1',
        email: 'joao@email.com',
        type: 'refresh',
        jti: 'jti-1',
      })
      refreshStore.isValid.mockResolvedValue(true)
      const blocked = user()
      blocked.block()
      users.findById.mockResolvedValue(blocked)

      await expect(service.refresh('refresh-token')).rejects.toThrow(
        'Refresh token inválido',
      )
    })
  })

  describe('logout', () => {
    it('revoga o refresh token do usuário', async () => {
      tokens.verifyRefresh.mockResolvedValue({
        sub: 'u1',
        email: 'joao@email.com',
        type: 'refresh',
        jti: 'jti-1',
      })

      await service.logout('refresh-token')

      expect(refreshStore.revoke).toHaveBeenCalledWith('jti-1')
    })
  })

  describe('auditoria (RF34/RB28)', () => {
    it('audita login bem-sucedido', async () => {
      users.findByEmail.mockResolvedValue(user())
      hasher.compare.mockResolvedValue(true)
      tokens.signAccessToken.mockResolvedValue('access-token')
      tokens.signRefreshToken.mockResolvedValue({
        token: 'refresh-token',
        jti: 'jti-1',
      })

      await service.login({ email: 'joao@email.com', password: 'senha123' })

      expect(audit.log).toHaveBeenCalledWith({
        userId: 'u1',
        action: 'login',
        entity: 'auth',
        metadata: { email: 'joao@email.com' },
      })
    })

    it('audita falha de login (senha incorreta)', async () => {
      users.findByEmail.mockResolvedValue(user())
      hasher.compare.mockResolvedValue(false)

      await expect(
        service.login({ email: 'joao@email.com', password: 'errada' }),
      ).rejects.toThrow('Credenciais inválidas')

      expect(audit.log).toHaveBeenCalledWith({
        action: 'login_failed',
        entity: 'auth',
        metadata: { email: 'joao@email.com', reason: 'invalid_credentials' },
      })
    })

    it('audita reuso de refresh token', async () => {
      tokens.verifyRefresh.mockResolvedValue({
        sub: 'u1',
        email: 'joao@email.com',
        type: 'refresh',
        jti: 'jti-1',
      })
      refreshStore.isValid.mockResolvedValue(false)

      await expect(service.refresh('reutilizado')).rejects.toThrow(
        'Refresh token inválido',
      )

      expect(audit.log).toHaveBeenCalledWith({
        action: 'token_reuse_detected',
        entity: 'auth',
        metadata: { sub: 'u1' },
      })
    })

    it('audita logout', async () => {
      tokens.verifyRefresh.mockResolvedValue({
        sub: 'u1',
        email: 'joao@email.com',
        type: 'refresh',
        jti: 'jti-1',
      })

      await service.logout('refresh-token')

      expect(audit.log).toHaveBeenCalledWith({
        userId: 'u1',
        action: 'logout',
        entity: 'auth',
      })
    })
  })
})
