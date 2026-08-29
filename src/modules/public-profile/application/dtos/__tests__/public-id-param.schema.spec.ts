import { publicIdParamSchema } from '../public-id-param.schema'

describe('publicIdParamSchema', () => {
  it('aceita um public ID válido (8 chars, sem 0/1/I/O)', () => {
    expect(publicIdParamSchema.parse('7F4K9M2Q')).toBe('7F4K9M2Q')
  })

  it('normaliza para uppercase', () => {
    expect(publicIdParamSchema.parse('7f4k9m2q')).toBe('7F4K9M2Q')
  })

  it('rejeita caracteres ambíguos (I, O, 0, 1)', () => {
    expect(() => publicIdParamSchema.parse('7F4K9M2I')).toThrow()
    expect(() => publicIdParamSchema.parse('7F4K9M2O')).toThrow()
    expect(() => publicIdParamSchema.parse('7F4K9M20')).toThrow()
    expect(() => publicIdParamSchema.parse('7F4K9M21')).toThrow()
  })

  it('rejeita tamanho diferente de 8', () => {
    expect(() => publicIdParamSchema.parse('ABC')).toThrow()
    expect(() => publicIdParamSchema.parse('ABCDEFGHIJKLMNOP')).toThrow()
  })
})
