import { Aes256GcmCipher } from '../aes256-gcm-cipher'

const KEY =
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'

describe('Aes256GcmCipher', () => {
  it('rejeita chave inválida', () => {
    expect(() => new Aes256GcmCipher('curta')).toThrow()
    expect(() => new Aes256GcmCipher('')).toThrow()
  })

  it('encrypt/decrypt roundtrip', () => {
    const cipher = new Aes256GcmCipher(KEY)
    const ciphertext = cipher.encrypt('token-secreto')
    expect(ciphertext).not.toContain('token-secreto')
    expect(cipher.decrypt(ciphertext)).toBe('token-secreto')
  })

  it('gera ciphertext diferente a cada encrypt (IV aleatório)', () => {
    const cipher = new Aes256GcmCipher(KEY)
    expect(cipher.encrypt('mesmo')).not.toBe(cipher.encrypt('mesmo'))
  })

  it('decrypt rejeita ciphertext malformado', () => {
    const cipher = new Aes256GcmCipher(KEY)
    expect(() => cipher.decrypt('invalido')).toThrow()
    expect(() => cipher.decrypt('iv:tag')).toThrow()
  })
})
