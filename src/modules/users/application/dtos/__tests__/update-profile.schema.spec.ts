import { updateProfileSchema } from '../update-profile.schema'

describe('updateProfileSchema', () => {
  it('normaliza telefone', () => {
    expect(
      updateProfileSchema.parse({ phone: '(21) 98888-7777' }).phone,
    ).toBe('+5521988887777')
  })

  it('null limpa', () => {
    expect(updateProfileSchema.parse({ phone: null }).phone).toBeNull()
  })

  it('ausente preserva', () => {
    expect(updateProfileSchema.parse({}).phone).toBeUndefined()
  })

  it('rejeita inválido', () => {
    expect(() => updateProfileSchema.parse({ phone: 'xyz' })).toThrow()
  })
})
