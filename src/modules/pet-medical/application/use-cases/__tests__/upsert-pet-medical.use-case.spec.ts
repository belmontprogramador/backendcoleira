import { UpsertPetMedicalUseCase } from '../upsert-pet-medical.use-case'
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

describe('UpsertPetMedicalUseCase', () => {
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

  it('cria quando não existe registro médico', async () => {
    pets.findById.mockResolvedValue(makePet('user-1'))
    featureAccess.hasFeature.mockResolvedValue(true)
    medical.findByPetId.mockResolvedValue(null)
    medical.save.mockResolvedValue(undefined)
    const useCase = new UpsertPetMedicalUseCase(pets, featureAccess, medical)

    const result = await useCase.execute('user-1', 'pet-1', {
      allergies: 'pólen',
    })

    expect(result.petId).toBe('pet-1')
    expect(result.allergies).toBe('pólen')
    expect(medical.save).toHaveBeenCalledTimes(1)
  })

  it('atualiza quando já existe registro médico', async () => {
    pets.findById.mockResolvedValue(makePet('user-1'))
    featureAccess.hasFeature.mockResolvedValue(true)
    const existing = PetMedical.create({ petId: 'pet-1', allergies: 'pólen' })
    medical.findByPetId.mockResolvedValue(existing)
    medical.save.mockResolvedValue(undefined)
    const useCase = new UpsertPetMedicalUseCase(pets, featureAccess, medical)

    const result = await useCase.execute('user-1', 'pet-1', {
      medications: 'X',
    })

    expect(result.allergies).toBe('pólen')
    expect(result.medications).toBe('X')
    expect(medical.save).toHaveBeenCalledWith(existing)
  })

  it('lança PetOwnerMismatchError se pet é de outro dono (IDOR)', async () => {
    pets.findById.mockResolvedValue(makePet('user-2'))
    const useCase = new UpsertPetMedicalUseCase(pets, featureAccess, medical)

    await expect(
      useCase.execute('user-1', 'pet-1', { allergies: 'pólen' }),
    ).rejects.toThrow(PetOwnerMismatchError)
  })

  it('lança FeatureNotAvailableError sem a feature', async () => {
    pets.findById.mockResolvedValue(makePet('user-1'))
    featureAccess.hasFeature.mockResolvedValue(false)
    const useCase = new UpsertPetMedicalUseCase(pets, featureAccess, medical)

    await expect(
      useCase.execute('user-1', 'pet-1', { allergies: 'pólen' }),
    ).rejects.toThrow(FeatureNotAvailableError)
  })

  it('lança PetNotFoundError se o pet não existe', async () => {
    pets.findById.mockResolvedValue(null)
    const useCase = new UpsertPetMedicalUseCase(pets, featureAccess, medical)

    await expect(
      useCase.execute('user-1', 'x', { allergies: 'pólen' }),
    ).rejects.toThrow(PetNotFoundError)
  })
})
