import { GetPetMedicalUseCase } from '../get-pet-medical.use-case'
import {
  PetNotFoundError,
  PetOwnerMismatchError,
} from '../../../../pets/application/errors'
import { FeatureNotAvailableError } from '../../../../../common/errors/feature-not-available.error'
import type { PetRepositoryPort } from '../../../../pets/domain/repositories/pet.repository.port'
import type { FeatureAccessPort } from '../../../../../common/ports/feature-access.port'
import type { PetMedicalRepositoryPort } from '../../../domain/repositories/pet-medical.repository.port'
import { Pet } from '../../../../pets/domain/entities/pet.entity'
import { PetSpecies } from '../../../../pets/domain/value-objects/pet-species.vo'
import { PetMedical } from '../../../domain/entities/pet-medical.entity'

describe('GetPetMedicalUseCase', () => {
  let pets: jest.Mocked<PetRepositoryPort>
  let featureAccess: jest.Mocked<FeatureAccessPort>
  let medical: jest.Mocked<PetMedicalRepositoryPort>

  beforeEach(() => {
    pets = {
      findById: jest.fn(),
      listByOwner: jest.fn(),
      listAll: jest.fn(),
      save: jest.fn(),
    }
    featureAccess = { hasFeature: jest.fn(), listFeatures: jest.fn() }
    medical = { findByPetId: jest.fn(), save: jest.fn() }
  })

  function makePet(ownerId: string): Pet {
    return Pet.create({
      id: 'pet-1',
      ownerId,
      name: 'Thor',
      species: PetSpecies.create('Cão'),
    })
  }

  it('retorna o PetMedical quando o owner tem a feature', async () => {
    pets.findById.mockResolvedValue(makePet('user-1'))
    featureAccess.hasFeature.mockResolvedValue(true)
    medical.findByPetId.mockResolvedValue(
      PetMedical.create({ petId: 'pet-1', allergies: 'pólen' }),
    )
    const useCase = new GetPetMedicalUseCase(pets, featureAccess, medical)

    const result = await useCase.execute('user-1', 'pet-1')

    expect(result?.allergies).toBe('pólen')
    expect(featureAccess.hasFeature).toHaveBeenCalledWith(
      'user-1',
      'PET_MEDICAL',
    )
  })

  it('retorna null quando não há registro médico', async () => {
    pets.findById.mockResolvedValue(makePet('user-1'))
    featureAccess.hasFeature.mockResolvedValue(true)
    medical.findByPetId.mockResolvedValue(null)
    const useCase = new GetPetMedicalUseCase(pets, featureAccess, medical)

    await expect(useCase.execute('user-1', 'pet-1')).resolves.toBeNull()
  })

  it('lança PetNotFoundError se o pet não existe', async () => {
    pets.findById.mockResolvedValue(null)
    const useCase = new GetPetMedicalUseCase(pets, featureAccess, medical)

    await expect(useCase.execute('user-1', 'x')).rejects.toThrow(
      PetNotFoundError,
    )
  })

  it('lança PetOwnerMismatchError se pet é de outro dono (IDOR)', async () => {
    pets.findById.mockResolvedValue(makePet('user-2'))
    const useCase = new GetPetMedicalUseCase(pets, featureAccess, medical)

    await expect(useCase.execute('user-1', 'pet-1')).rejects.toThrow(
      PetOwnerMismatchError,
    )
  })

  it('lança FeatureNotAvailableError sem a feature', async () => {
    pets.findById.mockResolvedValue(makePet('user-1'))
    featureAccess.hasFeature.mockResolvedValue(false)
    const useCase = new GetPetMedicalUseCase(pets, featureAccess, medical)

    await expect(useCase.execute('user-1', 'pet-1')).rejects.toThrow(
      FeatureNotAvailableError,
    )
  })
})
