import { ActivationCodeGenerator } from '../activation-code-generator'
import {
  ActivationCode,
  ACTIVATION_CODE_ALPHABET,
} from '../../../domain/value-objects/activation-code.vo'

describe('ActivationCodeGenerator', () => {
  it('gera código válido (formato XXXX-XXXX)', async () => {
    const gen = new ActivationCodeGenerator()
    const code = await gen.generate()

    expect(() => ActivationCode.create(code)).not.toThrow()
    expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/)
  })

  it('gera códigos apenas com caracteres do alfabeto permitido', async () => {
    const gen = new ActivationCodeGenerator()
    for (let i = 0; i < 20; i++) {
      const code = await gen.generate()
      for (const c of code.replace('-', '')) {
        expect(ACTIVATION_CODE_ALPHABET).toContain(c)
      }
    }
  })
})
