import { Pet, PetAlreadyDeletedError } from '../pet.entity'
import { PetSpecies } from '../../value-objects/pet-species.vo'
import { PetPrivacy } from '../../value-objects/pet-privacy.vo'

describe('Pet (agregado)', () => {
  it('cria um pet com defaults corretos', () => {
    const pet = Pet.create({
      id: 'pet-1',
      ownerId: 'user-1',
      name: 'Thor',
      species: PetSpecies.create('Cão'),
    })

    expect(pet.id).toBe('pet-1')
    expect(pet.ownerId).toBe('user-1')
    expect(pet.name).toBe('Thor')
    expect(pet.species.value).toBe('Cão')
    expect(pet.lostStatus).toBe(false)
    expect(pet.deletedAt).toBeNull()
    // privacy padrão criada junto
    expect(pet.privacy.showPhone).toBe(true)
    expect(pet.privacy.showCity).toBe(true)
  })

  it('aceita campos opcionais (breed, sex, city, etc.)', () => {
    const pet = Pet.create({
      id: 'pet-2',
      ownerId: 'user-1',
      name: 'Loki',
      species: PetSpecies.create('Gato'),
      breed: 'Siamês',
      sex: 'MALE',
      birthDate: new Date('2020-01-15'),
      city: 'Araruama',
      description: 'Gato esperto',
    })

    expect(pet.breed).toBe('Siamês')
    expect(pet.sex).toBe('MALE')
    expect(pet.city).toBe('Araruama')
    expect(pet.description).toBe('Gato esperto')
    expect(pet.birthDate?.toISOString()).toBe('2020-01-15T00:00:00.000Z')
  })

  it('marca e desmarca como perdido', () => {
    const pet = Pet.create({
      id: 'pet-1',
      ownerId: 'user-1',
      name: 'Thor',
      species: PetSpecies.create('Cão'),
    })

    pet.markLost()
    expect(pet.lostStatus).toBe(true)

    pet.markFound()
    expect(pet.lostStatus).toBe(false)
  })

  it('atualiza dados do perfil', () => {
    const pet = Pet.create({
      id: 'pet-1',
      ownerId: 'user-1',
      name: 'Thor',
      species: PetSpecies.create('Cão'),
    })

    pet.updateProfile({
      name: 'Thorzinho',
      city: 'Cabo Frio',
      description: 'Novo texto',
    })

    expect(pet.name).toBe('Thorzinho')
    expect(pet.city).toBe('Cabo Frio')
    expect(pet.description).toBe('Novo texto')
  })

  it('atualiza privacidade de forma imutável', () => {
    const pet = Pet.create({
      id: 'pet-1',
      ownerId: 'user-1',
      name: 'Thor',
      species: PetSpecies.create('Cão'),
    })

    pet.updatePrivacy({ showEmail: true, showMedical: true })

    expect(pet.privacy.showEmail).toBe(true)
    expect(pet.privacy.showMedical).toBe(true)
    expect(pet.privacy.showPhone).toBe(true) // preservada
  })

  it('faz soft delete (deactivate)', () => {
    const pet = Pet.create({
      id: 'pet-1',
      ownerId: 'user-1',
      name: 'Thor',
      species: PetSpecies.create('Cão'),
    })

    pet.deactivate()
    expect(pet.deletedAt).not.toBeNull()
  })

  it('lança erro ao operar em pet deletado', () => {
    const pet = Pet.create({
      id: 'pet-1',
      ownerId: 'user-1',
      name: 'Thor',
      species: PetSpecies.create('Cão'),
    })
    pet.deactivate()

    expect(() => pet.markLost()).toThrow(PetAlreadyDeletedError)
    expect(() => pet.updateProfile({ name: 'X' })).toThrow(
      PetAlreadyDeletedError,
    )
    expect(() => pet.updatePrivacy({ showEmail: true })).toThrow(
      PetAlreadyDeletedError,
    )
  })

  it('define e remove URL da foto', () => {
    const pet = Pet.create({
      id: 'pet-1',
      ownerId: 'user-1',
      name: 'Thor',
      species: PetSpecies.create('Cão'),
    })

    pet.setPhotoUrl('https://cdn.example.com/pets/pet-1.jpg')
    expect(pet.photoUrl).toBe('https://cdn.example.com/pets/pet-1.jpg')

    pet.removePhoto()
    expect(pet.photoUrl).toBeNull()
  })

  it('reconstitui a partir de dados persistidos', () => {
    const pet = Pet.reconstitute({
      id: 'pet-1',
      ownerId: 'user-1',
      name: 'Thor',
      species: PetSpecies.create('Cão'),
      breed: null,
      sex: null,
      birthDate: null,
      photoUrl: null,
      description: null,
      city: null,
      lostStatus: false,
      privacy: PetPrivacy.create(),
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      deletedAt: null,
    })

    expect(pet.id).toBe('pet-1')
    expect(pet.ownerId).toBe('user-1')
    expect(pet.lostStatus).toBe(false)
  })
})
