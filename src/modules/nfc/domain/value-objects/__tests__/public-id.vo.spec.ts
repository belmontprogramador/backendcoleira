import { PublicId, InvalidPublicIdError } from '../public-id.vo'

describe('PublicId', () => {
  it('aceita um Public ID válido de 8 caracteres', () => {
    const id = PublicId.create('7F4K9M2Q')
    expect(id.value).toBe('7F4K9M2Q')
  })

  it('rejeita tamanho diferente de 8', () => {
    expect(() => PublicId.create('ABC123')).toThrow(InvalidPublicIdError)
    expect(() => PublicId.create('ABC123456')).toThrow(InvalidPublicIdError)
  })

  it('rejeita caracteres proibidos (0, 1, vogais I/O)', () => {
    expect(() => PublicId.create('ABCD0EFG')).toThrow(InvalidPublicIdError)
    expect(() => PublicId.create('ABCD1EFG')).toThrow(InvalidPublicIdError)
    expect(() => PublicId.create('ABCDIEFG')).toThrow(InvalidPublicIdError)
    expect(() => PublicId.create('ABCDOEFG')).toThrow(InvalidPublicIdError)
  })

  it('aceita letras minúsculas e normaliza para maiúsculas', () => {
    const id = PublicId.create('7f4k9m2q')
    expect(id.value).toBe('7F4K9M2Q')
  })

  it('rejeita símbolos e espaços', () => {
    expect(() => PublicId.create('7F4K 9M2')).toThrow(InvalidPublicIdError)
    expect(() => PublicId.create('7F4K-9M2Q')).toThrow(InvalidPublicIdError)
  })
})
