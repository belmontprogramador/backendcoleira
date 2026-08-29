/**
 * Porta do armazenamento de refresh tokens (para rotação/revogação).
 * DIP: a aplicação depende desta abstração. A implementação usa Redis.
 */
export interface RefreshTokenStorePort {
  /** Registra um refresh token válido associado ao usuário. */
  save(tokenId: string, userId: string, ttlSeconds: number): Promise<void>
  /** Retorna true se o token ainda é válido (não rotacionado/revogado). */
  isValid(tokenId: string): Promise<boolean>
  /** Invalida um token (rotação) ou todos os do usuário (revogação em cadeia). */
  revoke(tokenId: string): Promise<void>
  revokeAllForUser(userId: string): Promise<void>
}

export const REFRESH_TOKEN_STORE_PORT = Symbol('REFRESH_TOKEN_STORE_PORT')
