import { CryptoPasswordGenerator } from '../crypto-password.generator'

describe('CryptoPasswordGenerator', () => {
  const generator = new CryptoPasswordGenerator()

  it('gera senha com 12 caracteres, com letra e número', () => {
    const password = generator.generate()
    expect(password).toHaveLength(12)
    expect(password).toMatch(/[a-zA-Z]/)
    expect(password).toMatch(/\d/)
  })

  it('gera senhas diferentes entre chamadas', () => {
    expect(generator.generate()).not.toBe(generator.generate())
  })
})
