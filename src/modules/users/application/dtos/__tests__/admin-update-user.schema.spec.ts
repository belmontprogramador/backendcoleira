import { adminUpdateUserSchema } from '../admin-update-user.schema'

describe('adminUpdateUserSchema', () => {
  it('normaliza telefone', () => {
    expect(
      adminUpdateUserSchema.parse({ phone: '(11) 91234-5678' }).phone,
    ).toBe('+5511912345678')
  })

  it('null limpa', () => {
    expect(adminUpdateUserSchema.parse({ phone: null }).phone).toBeNull()
  })

  it('ausente preserva', () => {
    expect(adminUpdateUserSchema.parse({}).phone).toBeUndefined()
  })

  it('rejeita inválido', () => {
    expect(() => adminUpdateUserSchema.parse({ phone: 'abc' })).toThrow()
  })
})
