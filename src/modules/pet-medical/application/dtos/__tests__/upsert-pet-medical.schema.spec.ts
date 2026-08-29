import { upsertPetMedicalSchema } from '../upsert-pet-medical.schema'

describe('upsertPetMedicalSchema', () => {
  it('aceita corpo vazio (todos os campos opcionais)', () => {
    const result = upsertPetMedicalSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('aceita campos preenchidos', () => {
    const result = upsertPetMedicalSchema.safeParse({
      allergies: 'pólen',
      medications: 'Prednisona',
      specialCare: 'Não molhar o curativo',
      medicalConditions: 'Dermatite',
      veterinarianName: 'Dr. Ana',
      veterinarianPhone: '(11) 98888-7777',
    })
    expect(result.success).toBe(true)
    expect(result.data?.allergies).toBe('pólen')
  })

  it('aceita null para limpar um campo', () => {
    const result = upsertPetMedicalSchema.safeParse({ allergies: null })
    expect(result.success).toBe(true)
    expect(result.data?.allergies).toBeNull()
  })

  it('rejeita tipo incorreto', () => {
    const result = upsertPetMedicalSchema.safeParse({ allergies: 123 })
    expect(result.success).toBe(false)
  })
})
