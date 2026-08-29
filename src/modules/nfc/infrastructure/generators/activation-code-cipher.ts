import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import type { ActivationCodeCipherPort } from '../../domain/services/activation-code-cipher.port'

const KEY_HEX_REGEX = /^[0-9a-fA-F]{64}$/

/**
 * Cifrador AES-256-GCM do código de ativação (crypto nativo do Node).
 *
 * Formato do ciphertext: `iv:authTag:data` (hex, separado por `:`).
 * - IV de 12 bytes aleatório por operação (nonce).
 * - AuthTag de 16 bytes garante integridade/autenticidade (GCM).
 * - A chave (32 bytes) é injetada pelo módulo via `ConfigService` (env).
 */
export class AesGcmActivationCodeCipher implements ActivationCodeCipherPort {
  private readonly key: Buffer

  constructor(keyHex: string) {
    if (!KEY_HEX_REGEX.test(keyHex)) {
      throw new Error(
        'ACTIVATION_CODE_ENC_KEY inválida: deve ter 32 bytes em hexadecimal (64 caracteres)',
      )
    }
    this.key = Buffer.from(keyHex, 'hex')
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', this.key, iv)
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ])
    const authTag = cipher.getAuthTag()
    return [iv, authTag, encrypted].map(buf => buf.toString('hex')).join(':')
  }

  decrypt(ciphertext: string): string {
    const [ivHex, authTagHex, dataHex] = ciphertext.split(':')
    if (!ivHex || !authTagHex || !dataHex) {
      throw new Error('Ciphertext de ativação malformado')
    }
    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.key,
      Buffer.from(ivHex, 'hex'),
    )
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'))
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataHex, 'hex')),
      decipher.final(),
    ])
    return decrypted.toString('utf8')
  }
}
