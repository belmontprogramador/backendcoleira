/** Credencial OAuth do Melhor Envio em texto puro (fora do banco). */
export interface StoredShippingCredential {
  accessToken: string
  refreshToken: string
  expiresAt: Date
}

/**
 * Porta de persistência da credencial OAuth do Melhor Envio (conta única).
 * A implementação Prisma criptografa os tokens em repouso (AES-256-GCM).
 */
export interface ShippingTokenStorePort {
  get(): Promise<StoredShippingCredential | null>
  save(credential: StoredShippingCredential): Promise<void>
  delete(): Promise<void>
}

export const SHIPPING_TOKEN_STORE_PORT = Symbol('SHIPPING_TOKEN_STORE_PORT')
