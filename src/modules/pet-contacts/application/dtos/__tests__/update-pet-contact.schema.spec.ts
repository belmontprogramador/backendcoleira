import { updatePetContactSchema } from '../update-pet-contact.schema'

describe('updatePetContactSchema', () => {
  it('aceita corpo vazio (todos os campos opcionais)', () => {
    const result = updatePetContactSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('aceita name', () => {
    const result = updatePetContactSchema.safeParse({ name: 'Maria S.' })
    expect(result.success).toBe(true)
    expect(result.data?.name).toBe('Maria S.')
  })

  it('aceita null para limpar phone', () => {
    const result = updatePetContactSchema.safeParse({ phone: null })
    expect(result.success).toBe(true)
    expect(result.data?.phone).toBeNull()
  })

  it('rejeita name vazio', () => {
    const result = updatePetContactSchema.safeParse({ name: '  ' })
    expect(result.success).toBe(false)
  })
})
