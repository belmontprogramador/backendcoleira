/**
 * Porta de cifragem de strings (AES-256-GCM) para tokens sensíveis do
 * `ShippingCredential` (access/refresh token Melhor Envio em repouso).
 */
export interface ShippingTokenCipherPort {
  encrypt(plaintext: string): string
  decrypt(ciphertext: string): string
}

export const SHIPPING_TOKEN_CIPHER_PORT = Symbol('SHIPPING_TOKEN_CIPHER_PORT')
