import { createPetContactSchema } from '../create-pet-contact.schema'

describe('createPetContactSchema', () => {
  it('aceita um contato válido', () => {
    const result = createPetContactSchema.safeParse({
      name: 'Maria',
      phone: '11999999999',
      email: 'maria@email.com',
      relationship: 'Mãe',
      isPrimary: true,
    })
    expect(result.success).toBe(true)
    expect(result.data?.name).toBe('Maria')
  })

  it('aceita apenas name (demais opcionais)', () => {
    const result = createPetContactSchema.safeParse({ name: 'Maria' })
    expect(result.success).toBe(true)
    expect(result.data?.isPrimary).toBeUndefined()
  })

  it('rejeita name vazio', () => {
    const result = createPetContactSchema.safeParse({ name: '   ' })
    expect(result.success).toBe(false)
  })

  it('rejeita email inválido', () => {
    const result = createPetContactSchema.safeParse({
      name: 'Maria',
      email: 'nao-email',
    })
    expect(result.success).toBe(false)
  })
})
