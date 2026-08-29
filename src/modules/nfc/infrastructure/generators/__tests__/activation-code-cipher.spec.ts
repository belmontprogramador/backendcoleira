import { AesGcmActivationCodeCipher } from '../activation-code-cipher'

const VALID_KEY =
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'

describe('AesGcmActivationCodeCipher (infra)', () => {
  it('criptografa e descriptografa de volta ao texto original (roundtrip)', () => {
    const cipher = new AesGcmActivationCodeCipher(VALID_KEY)
    const code = 'ABCD-2345'

    const encrypted = cipher.encrypt(code)

    expect(encrypted).not.toBe(code)
    expect(cipher.decrypt(encrypted)).toBe(code)
  })

  it('gera ciphertexts diferentes para o mesmo texto (IV aleatório)', () => {
    const cipher = new AesGcmActivationCodeCipher(VALID_KEY)
    const code = 'WXYZ-7890'

    const a = cipher.encrypt(code)
    const b = cipher.encrypt(code)

    expect(a).not.toBe(b)
    expect(cipher.decrypt(a)).toBe(code)
    expect(cipher.decrypt(b)).toBe(code)
  })

  it('não expõe o texto puro no ciphertext', () => {
    const cipher = new AesGcmActivationCodeCipher(VALID_KEY)
    const code = 'ABCD-2345'

    const encrypted = cipher.encrypt(code)

    expect(encrypted).not.toContain(code)
    expect(encrypted).toMatch(/^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/)
  })

  it('lança erro ao descriptografar ciphertext corrompido', () => {
    const cipher = new AesGcmActivationCodeCipher(VALID_KEY)
    const encrypted = cipher.encrypt('ABCD-2345')

    // Corrompe o payload (último segmento).
    const [iv, tag, data] = encrypted.split(':')
    const corrupted = `${iv}:${tag}:${'00'.repeat(data.length / 2)}`

    expect(() => cipher.decrypt(corrupted)).toThrow()
  })

  it('lança erro ao descriptografar com chave diferente', () => {
    const cipherA = new AesGcmActivationCodeCipher(VALID_KEY)
    const cipherB = new AesGcmActivationCodeCipher(
      'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210',
    )
    const encrypted = cipherA.encrypt('ABCD-2345')

    expect(() => cipherB.decrypt(encrypted)).toThrow()
  })

  it('rejeita chave com tamanho/formato inválido', () => {
    expect(() => new AesGcmActivationCodeCipher('curta')).toThrow()
    expect(() => new AesGcmActivationCodeCipher('z'.repeat(64))).toThrow()
  })
})
