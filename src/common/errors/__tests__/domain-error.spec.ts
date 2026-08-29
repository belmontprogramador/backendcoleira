import { DomainError } from '../domain-error'

class TestError extends DomainError {
  constructor(message: string, statusCode: number) {
    super(message, statusCode)
  }
}

describe('DomainError', () => {
  it('expõe o statusCode declarado pelo erro concreto', () => {
    const err = new TestError('boom', 404)
    expect(err.statusCode).toBe(404)
  })

  it('deriva o name automaticamente do construtor (sem this.name manual)', () => {
    const err = new TestError('boom', 400)
    expect(err.name).toBe('TestError')
  })

  it('preserva a mensagem e a cadeia de Error', () => {
    const err = new TestError('mensagem de teste', 409)
    expect(err.message).toBe('mensagem de teste')
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(DomainError)
  })
})
