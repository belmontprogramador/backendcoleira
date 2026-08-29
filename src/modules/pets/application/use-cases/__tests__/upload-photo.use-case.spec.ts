import { UploadPhotoUseCase } from '../upload-photo.use-case'
import { PetNotFoundError, PetOwnerMismatchError } from '../../errors'
import type { PetRepositoryPort } from '../../../domain/repositories/pet.repository.port'
import type { PetStoragePort } from '../../../infrastructure/storage/pet-storage.port'
import type { AuditLoggerPort } from '../../../../../common/ports/audit-logger.port'
import type { PublicProfileInvalidationPort } from '../../../../../common/ports/public-profile-invalidation.port'
import { Pet } from '../../../domain/entities/pet.entity'
import { PetSpecies } from '../../../domain/value-objects/pet-species.vo'

describe('UploadPhotoUseCase', () => {
  let pets: jest.Mocked<PetRepositoryPort>
  let storage: jest.Mocked<PetStoragePort>
  let audit: jest.Mocked<AuditLoggerPort>
  let invalidation: jest.Mocked<PublicProfileInvalidationPort>
  let useCase: UploadPhotoUseCase

  beforeEach(() => {
    pets = { findById: jest.fn(), listByOwner: jest.fn(), save: jest.fn() }
    storage = { upload: jest.fn(), remove: jest.fn() }
    audit = { log: jest.fn() }
    invalidation = {
      invalidateByPublicId: jest.fn(),
      invalidateByPetId: jest.fn(),
    }
    useCase = new UploadPhotoUseCase(pets, storage, audit, invalidation)
  })

  function makePet(ownerId: string): Pet {
    return Pet.create({
      id: 'pet-Thor',
      ownerId,
      name: 'Thor',
      species: PetSpecies.create('Cão'),
    })
  }

  it('faz upload e salva a URL da foto no pet', async () => {
    const pet = makePet('user-1')
    pets.findById.mockResolvedValue(pet)
    storage.upload.mockResolvedValue(
      'https://cdn.example.com/pets/pet-Thor/abc.jpg',
    )

    const result = await useCase.execute('user-1', 'pet-Thor', {
      buffer: Buffer.from('img'),
      contentType: 'image/jpeg',
      extension: 'jpg',
    })

    expect(storage.upload).toHaveBeenCalledWith(
      expect.stringMatching(/^pet-Thor\/.+\.jpg$/),
      expect.any(Buffer),
      'image/jpeg',
    )
    expect(result.photoUrl).toBe(
      'https://cdn.example.com/pets/pet-Thor/abc.jpg',
    )
    expect(pets.save).toHaveBeenCalled()
    expect(invalidation.invalidateByPetId).toHaveBeenCalledWith('pet-Thor')
  })

  it('rejeita pet de outro dono (IDOR)', async () => {
    pets.findById.mockResolvedValue(makePet('user-2'))

    await expect(
      useCase.execute('user-1', 'pet-Thor', {
        buffer: Buffer.from('img'),
        contentType: 'image/jpeg',
        extension: 'jpg',
      }),
    ).rejects.toThrow(PetOwnerMismatchError)
    expect(storage.upload).not.toHaveBeenCalled()
    expect(invalidation.invalidateByPetId).not.toHaveBeenCalled()
  })

  it('lança PetNotFoundError se não existe', async () => {
    pets.findById.mockResolvedValue(null)

    await expect(
      useCase.execute('user-1', 'x', {
        buffer: Buffer.from('img'),
        contentType: 'image/jpeg',
        extension: 'jpg',
      }),
    ).rejects.toThrow(PetNotFoundError)
    expect(invalidation.invalidateByPetId).not.toHaveBeenCalled()
  })
})
