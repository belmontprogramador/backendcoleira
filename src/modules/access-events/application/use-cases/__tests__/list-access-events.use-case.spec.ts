import { ListAccessEventsUseCase } from '../list-access-events.use-case'
import {
  PetNotFoundError,
  PetOwnerMismatchError,
} from '../../../../pets/application/errors'
import { FeatureNotAvailableError } from '../../../../../common/errors/feature-not-available.error'
import type { PetRepositoryPort } from '../../../../pets/domain/repositories/pet.repository.port'
import type { FeatureAccessPort } from '../../../../../common/ports/feature-access.port'
import type { AccessEventRepositoryPort } from '../../../domain/repositories/access-event.repository.port'
import { Pet } from '../../../../pets/domain/entities/pet.entity'
import { PetSpecies } from '../../../../pets/domain/value-objects/pet-species.vo'
import { AccessEvent } from '../../../domain/entities/access-event.entity'
import { AccessSource } from '../../../../../common/constants/access-source'

describe('ListAccessEventsUseCase', () => {
  let pets: jest.Mocked<PetRepositoryPort>
  let featureAccess: jest.Mocked<FeatureAccessPort>
  let events: jest.Mocked<AccessEventRepositoryPort>

  beforeEach(() => {
    pets = {
      findById: jest.fn(),
      listByOwner: jest.fn(),
      listAll: jest.fn(),
      save: jest.fn(),
    }
    featureAccess = { hasFeature: jest.fn(), listFeatures: jest.fn() }
    events = { create: jest.fn(), listByPet: jest.fn() }
  })

  function makePet(ownerId: string): Pet {
    return Pet.create({
      id: 'pet-1',
      ownerId,
      name: 'Thor',
      species: PetSpecies.create('Cão'),
    })
  }

  it('lista acessos do pet com a feature', async () => {
    pets.findById.mockResolvedValue(makePet('user-1'))
    featureAccess.hasFeature.mockResolvedValue(true)
    events.listByPet.mockResolvedValue([
      AccessEvent.create({
        id: 'ev-1',
        petId: 'pet-1',
        source: AccessSource.NFC,
      }),
    ])
    const useCase = new ListAccessEventsUseCase(pets, featureAccess, events)

    const result = await useCase.execute('user-1', 'pet-1')

    expect(result).toHaveLength(1)
    expect(events.listByPet).toHaveBeenCalledWith('pet-1')
    expect(featureAccess.hasFeature).toHaveBeenCalledWith(
      'user-1',
      'ACCESS_HISTORY',
    )
  })

  it('lança FeatureNotAvailableError sem a feature', async () => {
    pets.findById.mockResolvedValue(makePet('user-1'))
    featureAccess.hasFeature.mockResolvedValue(false)
    const useCase = new ListAccessEventsUseCase(pets, featureAccess, events)

    await expect(useCase.execute('user-1', 'pet-1')).rejects.toThrow(
      FeatureNotAvailableError,
    )
  })

  it('lança PetOwnerMismatchError se pet é de outro dono', async () => {
    pets.findById.mockResolvedValue(makePet('user-2'))
    const useCase = new ListAccessEventsUseCase(pets, featureAccess, events)

    await expect(useCase.execute('user-1', 'pet-1')).rejects.toThrow(
      PetOwnerMismatchError,
    )
  })

  it('lança PetNotFoundError se o pet não existe', async () => {
    pets.findById.mockResolvedValue(null)
    const useCase = new ListAccessEventsUseCase(pets, featureAccess, events)

    await expect(useCase.execute('user-1', 'x')).rejects.toThrow(
      PetNotFoundError,
    )
  })
})
