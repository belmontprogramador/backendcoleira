import { Password, WeakPasswordError } from '../password.vo'

describe('Password (value object)', () => {
  it('cria uma senha válida', () => {
    const password = Password.create('senhaForte123')
    expect(password.value).toBe('senhaForte123')
  })

  it('aceita senha com exatamente 8 caracteres (letras + números)', () => {
    const password = Password.create('Abcd1234')
    expect(password.value).toBe('Abcd1234')
  })

  it('rejeita senha com menos de 8 caracteres', () => {
    expect(() => Password.create('Abcd12')).toThrow(WeakPasswordError)
  })

  it('rejeita senha só com letras (sem número)', () => {
    expect(() => Password.create('somenteletras')).toThrow(WeakPasswordError)
  })

  it('rejeita senha só com números (sem letra)', () => {
    expect(() => Password.create('12345678')).toThrow(WeakPasswordError)
  })

  it('rejeita string vazia', () => {
    expect(() => Password.create('')).toThrow(WeakPasswordError)
  })
})
