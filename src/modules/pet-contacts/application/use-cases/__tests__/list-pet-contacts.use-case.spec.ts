import { ListPetContactsUseCase } from '../list-pet-contacts.use-case'
import {
  PetNotFoundError,
  PetOwnerMismatchError,
} from '../../../../pets/application/errors'
import { FeatureNotAvailableError } from '../../../../../common/errors/feature-not-available.error'
import type { PetRepositoryPort } from '../../../../pets/domain/repositories/pet.repository.port'
import type { FeatureAccessPort } from '../../../../../common/ports/feature-access.port'
import type { PetContactRepositoryPort } from '../../../domain/repositories/pet-contact.repository.port'
import { Pet } from '../../../../pets/domain/entities/pet.entity'
import { PetSpecies } from '../../../../pets/domain/value-objects/pet-species.vo'
import { PetContact } from '../../../domain/entities/pet-contact.entity'

describe('ListPetContactsUseCase', () => {
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

  it('lista contatos com a feature', async () => {
    pets.findById.mockResolvedValue(makePet('user-1'))
    featureAccess.hasFeature.mockResolvedValue(true)
    contacts.listByPet.mockResolvedValue([
      PetContact.create({ id: 'c-1', petId: 'pet-1', name: 'João' }),
    ])
    const useCase = new ListPetContactsUseCase(pets, featureAccess, contacts)

    const result = await useCase.execute('user-1', 'pet-1')

    expect(result).toHaveLength(1)
    expect(contacts.listByPet).toHaveBeenCalledWith('pet-1')
    expect(featureAccess.hasFeature).toHaveBeenCalledWith(
      'user-1',
      'MULTIPLE_CONTACTS',
    )
  })

  it('lança FeatureNotAvailableError sem a feature', async () => {
    pets.findById.mockResolvedValue(makePet('user-1'))
    featureAccess.hasFeature.mockResolvedValue(false)
    const useCase = new ListPetContactsUseCase(pets, featureAccess, contacts)

    await expect(useCase.execute('user-1', 'pet-1')).rejects.toThrow(
      FeatureNotAvailableError,
    )
  })

  it('lança PetOwnerMismatchError se pet é de outro dono', async () => {
    pets.findById.mockResolvedValue(makePet('user-2'))
    const useCase = new ListPetContactsUseCase(pets, featureAccess, contacts)

    await expect(useCase.execute('user-1', 'pet-1')).rejects.toThrow(
      PetOwnerMismatchError,
    )
  })

  it('lança PetNotFoundError se o pet não existe', async () => {
    pets.findById.mockResolvedValue(null)
    const useCase = new ListPetContactsUseCase(pets, featureAccess, contacts)

    await expect(useCase.execute('user-1', 'x')).rejects.toThrow(
      PetNotFoundError,
    )
  })
})
