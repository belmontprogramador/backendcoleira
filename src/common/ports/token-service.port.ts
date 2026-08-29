export interface AccessTokenPayload {
  sub: string
  email: string
  type: 'access'
}

export interface RefreshTokenPayload {
  sub: string
  email: string
  type: 'refresh'
  jti: string
}

export interface RefreshToken {
  token: string
  jti: string
}

/**
 * Porta do serviço de tokens JWT.
 * DIP: a aplicação depende desta abstração (JWT é implementação).
 *
 * A verificação é **separada por tipo de token** (`verifyAccess` e
 * `verifyRefresh`), cada um validando exclusivamente com o seu segredo. Isso
 * impede que um access token seja aceito no fluxo de refresh (e vice-versa).
 */
export interface TokenServicePort {
  signAccessToken(payload: { sub: string; email: string }): Promise<string>
  signRefreshToken(payload: {
    sub: string
    email: string
  }): Promise<RefreshToken>
  verifyAccess(token: string): Promise<AccessTokenPayload>
  verifyRefresh(token: string): Promise<RefreshTokenPayload>
}

export const TOKEN_SERVICE_PORT = Symbol('TOKEN_SERVICE_PORT')
