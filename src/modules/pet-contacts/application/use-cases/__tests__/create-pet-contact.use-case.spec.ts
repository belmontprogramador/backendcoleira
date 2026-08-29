import { CreatePetContactUseCase } from '../create-pet-contact.use-case'
import { FeatureNotAvailableError } from '../../../../../common/errors/feature-not-available.error'
import type { PetRepositoryPort } from '../../../../pets/domain/repositories/pet.repository.port'
import type { FeatureAccessPort } from '../../../../../common/ports/feature-access.port'
import type { PetContactRepositoryPort } from '../../../domain/repositories/pet-contact.repository.port'
import { Pet } from '../../../../pets/domain/entities/pet.entity'
import { PetSpecies } from '../../../../pets/domain/value-objects/pet-species.vo'

describe('CreatePetContactUseCase', () => {
  let pets: jest.Mocked<PetRepositoryPort>
  let featureAccess: jest.Mocked<FeatureAccessPort>
  let contacts: jest.Mocked<PetContactRepositoryPort>

  beforeEach(() => {
    pets = {
      findById: jest.fn(),
      listByOwner: jest.fn(),
      listAll: jest.fn(),
      save: jest.fn(),
    }
    featureAccess = { hasFeature: jest.fn(), listFeatures: jest.fn() }
    contacts = {
      listByPet: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    }
  })

  function makePet(ownerId: string): Pet {
    return Pet.create({
      id: 'pet-1',
      ownerId,
      name: 'Thor',
      species: PetSpecies.create('Cão'),
    })
  }

  it('cria um contato do pet', async () => {
    pets.findById.mockResolvedValue(makePet('user-1'))
    featureAccess.hasFeature.mockResolvedValue(true)
    contacts.save.mockResolvedValue(undefined)
    const useCase = new CreatePetContactUseCase(pets, featureAccess, contacts)

    const result = await useCase.execute('user-1', 'pet-1', {
      name: 'Maria',
      relationship: 'Mãe',
      isPrimary: true,
    })

    expect(result.petId).toBe('pet-1')
    expect(result.name).toBe('Maria')
    expect(result.isPrimary).toBe(true)
    expect(contacts.save).toHaveBeenCalledTimes(1)
  })

  it('lança FeatureNotAvailableError sem a feature', async () => {
    pets.findById.mockResolvedValue(makePet('user-1'))
    featureAccess.hasFeature.mockResolvedValue(false)
    const useCase = new CreatePetContactUseCase(pets, featureAccess, contacts)

    await expect(
      useCase.execute('user-1', 'pet-1', { name: 'Maria' }),
    ).rejects.toThrow(FeatureNotAvailableError)
  })
})
