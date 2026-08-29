import {
  ActivationCode,
  InvalidActivationCodeError,
} from '../activation-code.vo'

describe('ActivationCode', () => {
  it('aceita formato XXXX-XXXX válido', () => {
    const code = ActivationCode.create('X8P4-L2Q9')
    expect(code.value).toBe('X8P4-L2Q9')
  })

  it('rejeita formato inválido (sem hífen)', () => {
    expect(() => ActivationCode.create('X8P4L2Q9')).toThrow(
      InvalidActivationCodeError,
    )
  })

  it('rejeita caracteres proibidos (0, 1, vogais I/O)', () => {
    expect(() => ActivationCode.create('X8P0-L2Q9')).toThrow(
      InvalidActivationCodeError,
    )
    expect(() => ActivationCode.create('X8PI-L2Q9')).toThrow(
      InvalidActivationCodeError,
    )
  })

  it('aceita minúsculas e normaliza', () => {
    const code = ActivationCode.create('x8p4-l2q9')
    expect(code.value).toBe('X8P4-L2Q9')
  })

  it('rejeita tamanho errado', () => {
    expect(() => ActivationCode.create('X8P4-L2Q')).toThrow(
      InvalidActivationCodeError,
    )
    expect(() => ActivationCode.create('X8P4-L2Q99')).toThrow(
      InvalidActivationCodeError,
    )
  })
})
