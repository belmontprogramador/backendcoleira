import { PetContact, InvalidPetContactError } from '../pet-contact.entity'

describe('PetContact (entidade)', () => {
  it('cria com name trimado', () => {
    const c = PetContact.create({ id: 'c-1', petId: 'pet-1', name: '  João  ' })

    expect(c.name).toBe('João')
  })

  it('rejeita name vazio', () => {
    expect(() =>
      PetContact.create({ id: 'c-1', petId: 'pet-1', name: '   ' }),
    ).toThrow(InvalidPetContactError)
  })

  it('cria com opcionais e isPrimary default false', () => {
    const c = PetContact.create({
      id: 'c-1',
      petId: 'pet-1',
      name: 'Maria',
      relationship: 'Mãe',
      phone: '11999999999',
    })

    expect(c.isPrimary).toBe(false)
    expect(c.relationship).toBe('Mãe')
    expect(c.phone).toBe('11999999999')
    expect(c.email).toBeNull()
  })

  it('update substitui campos informados e preserva os demais', () => {
    const c = PetContact.create({
      id: 'c-1',
      petId: 'pet-1',
      name: 'Maria',
      isPrimary: false,
    })

    c.update({ name: 'Maria S.', isPrimary: true, phone: null })

    expect(c.name).toBe('Maria S.')
    expect(c.isPrimary).toBe(true)
    expect(c.phone).toBeNull()
    expect(c.email).toBeNull()
  })

  it('update rejeita name vazio', () => {
    const c = PetContact.create({ id: 'c-1', petId: 'pet-1', name: 'Maria' })

    expect(() => c.update({ name: '  ' })).toThrow(InvalidPetContactError)
  })

  it('reconstitute restaura createdAt/updatedAt originais', () => {
    const createdAt = new Date('2026-01-01T00:00:00Z')
    const updatedAt = new Date('2026-02-01T00:00:00Z')

    const c = PetContact.reconstitute({
      id: 'c-1',
      petId: 'pet-1',
      name: 'Maria',
      phone: null,
      email: null,
      relationship: null,
      isPrimary: true,
      createdAt,
      updatedAt,
    })

    expect(c.id).toBe('c-1')
    expect(c.isPrimary).toBe(true)
    expect(c.createdAt).toBe(createdAt)
    expect(c.updatedAt).toBe(updatedAt)
  })
})
