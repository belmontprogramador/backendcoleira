import { PetMedical } from '../pet-medical.entity'

describe('PetMedical (entidade)', () => {
  it('cria com campos nulos por padrão', () => {
    const m = PetMedical.create({ petId: 'pet-1' })

    expect(m.petId).toBe('pet-1')
    expect(m.allergies).toBeNull()
    expect(m.medications).toBeNull()
    expect(m.specialCare).toBeNull()
    expect(m.medicalConditions).toBeNull()
    expect(m.veterinarianName).toBeNull()
    expect(m.veterinarianPhone).toBeNull()
    expect(m.createdAt).toBeInstanceOf(Date)
    expect(m.updatedAt).toBeInstanceOf(Date)
  })

  it('cria com dados preenchidos', () => {
    const m = PetMedical.create({
      petId: 'pet-1',
      allergies: 'pólen',
      veterinarianName: 'Dr. Ana',
    })

    expect(m.allergies).toBe('pólen')
    expect(m.veterinarianName).toBe('Dr. Ana')
    expect(m.medications).toBeNull()
  })

  it('update substitui os campos informados e preserva os demais', () => {
    const m = PetMedical.create({
      petId: 'pet-1',
      allergies: 'pólen',
      medications: 'A',
    })

    m.update({ medications: 'B', veterinarianName: 'Dr. Ana' })

    expect(m.allergies).toBe('pólen')
    expect(m.medications).toBe('B')
    expect(m.veterinarianName).toBe('Dr. Ana')
  })

  it('update com null limpa o campo', () => {
    const m = PetMedical.create({ petId: 'pet-1', allergies: 'pólen' })

    m.update({ allergies: null })

    expect(m.allergies).toBeNull()
  })

  it('reconstitute restaura createdAt/updatedAt originais', () => {
    const createdAt = new Date('2026-01-01T00:00:00Z')
    const updatedAt = new Date('2026-02-01T00:00:00Z')

    const m = PetMedical.reconstitute({
      petId: 'pet-1',
      allergies: null,
      medications: null,
      specialCare: null,
      medicalConditions: null,
      veterinarianName: null,
      veterinarianPhone: null,
      createdAt,
      updatedAt,
    })

    expect(m.createdAt).toBe(createdAt)
    expect(m.updatedAt).toBe(updatedAt)
  })

  it('update atualiza o updatedAt', () => {
    const m = PetMedical.create({ petId: 'pet-1' })
    const before = m.updatedAt.getTime()

    m.update({ allergies: 'x' })

    expect(m.updatedAt.getTime()).toBeGreaterThanOrEqual(before)
  })
})
