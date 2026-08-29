import { Email, InvalidEmailError } from '../email.vo'

describe('Email (value object)', () => {
  it('cria um email válido', () => {
    const email = Email.create('joao@email.com')
    expect(email.value).toBe('joao@email.com')
  })

  it('normaliza para lowercase', () => {
    const email = Email.create('Joao@Email.COM')
    expect(email.value).toBe('joao@email.com')
  })

  it('remove espaços em branco nas bordas', () => {
    const email = Email.create('  joao@email.com  ')
    expect(email.value).toBe('joao@email.com')
  })

  it('rejeita email sem @', () => {
    expect(() => Email.create('joaoemail.com')).toThrow(InvalidEmailError)
  })

  it('rejeita email sem domínio', () => {
    expect(() => Email.create('joao@')).toThrow(InvalidEmailError)
  })

  it('rejeita string vazia', () => {
    expect(() => Email.create('')).toThrow(InvalidEmailError)
  })
})
