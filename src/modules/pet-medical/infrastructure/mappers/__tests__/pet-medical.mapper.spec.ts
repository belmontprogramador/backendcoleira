import { PetMedical } from '../../../domain/entities/pet-medical.entity'
import type { PetMedicalModel } from '../../../../../generated/prisma/models/PetMedical'
import { PetMedicalMapper } from '../pet-medical.mapper'

describe('PetMedicalMapper', () => {
  it('toPersistence converte para snake_case', () => {
    const m = PetMedical.create({
      petId: 'pet-1',
      allergies: 'pólen',
      veterinarianName: 'Dr. Ana',
    })

    const data = PetMedicalMapper.toPersistence(m)

    expect(data.pet_id).toBe('pet-1')
    expect(data.allergies).toBe('pólen')
    expect(data.veterinarian_name).toBe('Dr. Ana')
    expect(data.medical_conditions).toBeNull()
    expect(data.created_at).toBe(m.createdAt)
    expect(data.updated_at).toBe(m.updatedAt)
  })

  it('toDomain reconstrói a entidade', () => {
    const createdAt = new Date('2026-01-01T00:00:00Z')
    const updatedAt = new Date('2026-02-01T00:00:00Z')

    const model = {
      pet_id: 'pet-1',
      allergies: 'pólen',
      medications: null,
      special_care: null,
      medical_conditions: null,
      veterinarian_name: 'Dr. Ana',
      veterinarian_phone: null,
      created_at: createdAt,
      updated_at: updatedAt,
    } as PetMedicalModel

    const m = PetMedicalMapper.toDomain(model)

    expect(m.petId).toBe('pet-1')
    expect(m.allergies).toBe('pólen')
    expect(m.veterinarianName).toBe('Dr. Ana')
    expect(m.createdAt).toBe(createdAt)
    expect(m.updatedAt).toBe(updatedAt)
  })
})
