/**
 * Porta do cifrador do código de ativação (AES-256-GCM).
 *
 * Ao contrário do hash (irreversível), a criptografia é REVERSÍVEL: o código
 * em texto puro pode ser recuperado a qualquer momento (reimprimir cartão,
 * reemitir). O valor em repouso no banco é sempre o ciphertext — nunca o texto
 * puro.
 */
export interface ActivationCodeCipherPort {
  /** Criptografa o código em texto puro e devolve o ciphertext (opaco). */
  encrypt(plaintext: string): string
  /** Descriptografa o ciphertext de volta ao código em texto puro. */
  decrypt(ciphertext: string): string
}

export const ACTIVATION_CODE_CIPHER_PORT = Symbol('ACTIVATION_CODE_CIPHER_PORT')
