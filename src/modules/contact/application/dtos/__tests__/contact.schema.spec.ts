import { contactSchema } from '../contact.schema'

describe('contactSchema', () => {
  it('aceita um corpo válido com todos os campos opcionais', () => {
    const result = contactSchema.safeParse({
      message: 'Achei seu cachorro!',
      sender_name: 'Ana',
      sender_phone: '(21) 98888-7777',
      sender_email: 'ana@example.com',
      source: 'qr',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual({
        message: 'Achei seu cachorro!',
        sender_name: 'Ana',
        sender_phone: '(21) 98888-7777',
        sender_email: 'ana@example.com',
        source: 'qr',
      })
    }
  })

  it('aceita corpo mínimo (somente message) e aplica default source=direct', () => {
    const result = contactSchema.safeParse({ message: 'Oi' })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.source).toBe('direct')
      expect(result.data.sender_name).toBeUndefined()
      expect(result.data.sender_phone).toBeUndefined()
      expect(result.data.sender_email).toBeUndefined()
    }
  })

  it('rejeita quando message está ausente', () => {
    const result = contactSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejeita message vazia (após trim)', () => {
    const result = contactSchema.safeParse({ message: '   ' })
    expect(result.success).toBe(false)
  })

  it('rejeita message acima de 1000 caracteres', () => {
    const result = contactSchema.safeParse({ message: 'a'.repeat(1001) })
    expect(result.success).toBe(false)
  })

  it('rejeita sender_name acima de 100 caracteres', () => {
    const result = contactSchema.safeParse({
      message: 'Oi',
      sender_name: 'a'.repeat(101),
    })
    expect(result.success).toBe(false)
  })

  it('rejeita sender_email inválido', () => {
    const result = contactSchema.safeParse({
      message: 'Oi',
      sender_email: 'nao-e-email',
    })
    expect(result.success).toBe(false)
  })

  it('aceita sender_phone no formato brasileiro com ponto', () => {
    const result = contactSchema.safeParse({
      message: 'Oi',
      sender_phone: '(22) 9.9105-9163',
    })

    expect(result.success).toBe(true)
  })

  it('rejeita sender_phone inválido', () => {
    const result = contactSchema.safeParse({
      message: 'Oi',
      sender_phone: 'abc',
    })
    expect(result.success).toBe(false)
  })

  it('rejeita source inválido', () => {
    const result = contactSchema.safeParse({
      message: 'Oi',
      source: 'telefone',
    })
    expect(result.success).toBe(false)
  })
})
