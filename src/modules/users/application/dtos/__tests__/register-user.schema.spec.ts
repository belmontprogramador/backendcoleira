import { registerUserSchema } from '../register-user.schema'

describe('registerUserSchema', () => {
  const base = {
    name: 'Belmont',
    email: 'belmont@example.com',
    password: 'senha123456',
  }

  it('aceita cadastro válido sem telefone', () => {
    expect(registerUserSchema.parse(base).phone).toBeUndefined()
  })

  it('normaliza telefone válido', () => {
    expect(
      registerUserSchema.parse({ ...base, phone: '(11) 99999-9999' }).phone,
    ).toBe('+5511999999999')
  })

  it('aceita null e vazio → null', () => {
    expect(registerUserSchema.parse({ ...base, phone: null }).phone).toBeNull()
    expect(registerUserSchema.parse({ ...base, phone: '' }).phone).toBeNull()
  })

  it('rejeita telefone inválido', () => {
    expect(() => registerUserSchema.parse({ ...base, phone: 'abc' })).toThrow()
  })
})
