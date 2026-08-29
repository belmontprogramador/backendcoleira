import { DeletePetContactUseCase } from '../delete-pet-contact.use-case'
import { PetContactNotFoundError } from '../../errors'
import { FeatureNotAvailableError } from '../../../../../common/errors/feature-not-available.error'
import type { PetRepositoryPort } from '../../../../pets/domain/repositories/pet.repository.port'
import type { FeatureAccessPort } from '../../../../../common/ports/feature-access.port'
import type { PetContactRepositoryPort } from '../../../domain/repositories/pet-contact.repository.port'
import { Pet } from '../../../../pets/domain/entities/pet.entity'
import { PetSpecies } from '../../../../pets/domain/value-objects/pet-species.vo'
import { PetContact } from '../../../domain/entities/pet-contact.entity'

describe('DeletePetContactUseCase', () => {
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

  it('remove um contato do pet', async () => {
    pets.findById.mockResolvedValue(makePet('user-1'))
    featureAccess.hasFeature.mockResolvedValue(true)
    const c = PetContact.create({ id: 'c-1', petId: 'pet-1', name: 'Maria' })
    contacts.findById.mockResolvedValue(c)
    contacts.delete.mockResolvedValue(undefined)
    const useCase = new DeletePetContactUseCase(pets, featureAccess, contacts)

    await useCase.execute('user-1', 'pet-1', 'c-1')

    expect(contacts.delete).toHaveBeenCalledWith('c-1')
  })

  it('lança PetContactNotFoundError se o contato pertence a outro pet', async () => {
    pets.findById.mockResolvedValue(makePet('user-1'))
    featureAccess.hasFeature.mockResolvedValue(true)
    const c = PetContact.create({ id: 'c-1', petId: 'pet-2', name: 'Maria' })
    contacts.findById.mockResolvedValue(c)
    const useCase = new DeletePetContactUseCase(pets, featureAccess, contacts)

    await expect(useCase.execute('user-1', 'pet-1', 'c-1')).rejects.toThrow(
      PetContactNotFoundError,
    )
  })

  it('lança FeatureNotAvailableError sem a feature', async () => {
    pets.findById.mockResolvedValue(makePet('user-1'))
    featureAccess.hasFeature.mockResolvedValue(false)
    const useCase = new DeletePetContactUseCase(pets, featureAccess, contacts)

    await expect(useCase.execute('user-1', 'pet-1', 'c-1')).rejects.toThrow(
      FeatureNotAvailableError,
    )
  })
})
