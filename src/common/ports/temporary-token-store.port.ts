/**
 * Porta de armazenamento de tokens temporários (verificação de email,
 * recuperação de senha). DIP: implementação usa Redis.
 */
export interface TemporaryTokenStorePort {
  /** Gera um token e o armazena associado ao userId/email com TTL. */
  save(key: string, value: string, ttlSeconds: number): Promise<void>
  /** Retorna o valor associado e o consome (single-use), ou null se inválido. */
  consume(key: string): Promise<string | null>
}

export const TEMPORARY_TOKEN_STORE_PORT = Symbol('TEMPORARY_TOKEN_STORE_PORT')
