import { PetContact } from '../../../domain/entities/pet-contact.entity'
import type { PetContactModel } from '../../../../../generated/prisma/models/PetContact'
import { PetContactMapper } from '../pet-contact.mapper'

describe('PetContactMapper', () => {
  it('toPersistence converte para snake_case', () => {
    const c = PetContact.create({
      id: 'c-1',
      petId: 'pet-1',
      name: 'Maria',
      relationship: 'Mãe',
      isPrimary: true,
    })

    const data = PetContactMapper.toPersistence(c)

    expect(data.id).toBe('c-1')
    expect(data.pet_id).toBe('pet-1')
    expect(data.name).toBe('Maria')
    expect(data.relationship).toBe('Mãe')
    expect(data.is_primary).toBe(true)
    expect(data.email).toBeNull()
  })

  it('toDomain reconstrói a entidade', () => {
    const createdAt = new Date('2026-01-01T00:00:00Z')
    const updatedAt = new Date('2026-02-01T00:00:00Z')

    const model = {
      id: 'c-1',
      pet_id: 'pet-1',
      name: 'Maria',
      phone: '11999999999',
      email: null,
      relationship: 'Mãe',
      is_primary: false,
      created_at: createdAt,
      updated_at: updatedAt,
    } as PetContactModel

    const c = PetContactMapper.toDomain(model)

    expect(c.id).toBe('c-1')
    expect(c.petId).toBe('pet-1')
    expect(c.phone).toBe('11999999999')
    expect(c.isPrimary).toBe(false)
    expect(c.createdAt).toBe(createdAt)
  })
})
