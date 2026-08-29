import { UpdatePetUseCase } from '../update-pet.use-case'
import { DeletePetUseCase } from '../delete-pet.use-case'
import { SetLostStatusUseCase } from '../set-lost-status.use-case'
import { UpdatePrivacyUseCase } from '../update-privacy.use-case'
import { PetNotFoundError, PetOwnerMismatchError } from '../../errors'
import type { PetRepositoryPort } from '../../../domain/repositories/pet.repository.port'
import type { AuditLoggerPort } from '../../../../../common/ports/audit-logger.port'
import type { PublicProfileInvalidationPort } from '../../../../../common/ports/public-profile-invalidation.port'
import { Pet } from '../../../domain/entities/pet.entity'
import { PetSpecies } from '../../../domain/value-objects/pet-species.vo'

describe('Pets — mutações (update/delete/lost/privacy)', () => {
  let pets: jest.Mocked<PetRepositoryPort>
  let audit: jest.Mocked<AuditLoggerPort>
  let invalidation: jest.Mocked<PublicProfileInvalidationPort>

  beforeEach(() => {
    pets = { findById: jest.fn(), listByOwner: jest.fn(), save: jest.fn() }
    audit = { log: jest.fn() }
    invalidation = {
      invalidateByPublicId: jest.fn(),
      invalidateByPetId: jest.fn(),
    }
  })

  function makePet(ownerId: string, name = 'Thor'): Pet {
    return Pet.create({
      id: 'pet-Thor',
      ownerId,
      name,
      species: PetSpecies.create('Cão'),
    })
  }

  describe('UpdatePetUseCase', () => {
    it('atualiza perfil do próprio pet', async () => {
      const pet = makePet('user-1')
      pets.findById.mockResolvedValue(pet)
      const useCase = new UpdatePetUseCase(pets, audit, invalidation)

      const result = await useCase.execute('user-1', 'pet-Thor', {
        name: 'Thorzinho',
        city: 'Cabo Frio',
      })

      expect(result.name).toBe('Thorzinho')
      expect(result.city).toBe('Cabo Frio')
      expect(pets.save).toHaveBeenCalled()
      expect(invalidation.invalidateByPetId).toHaveBeenCalledWith('pet-Thor')
    })

    it('rejeita pet de outro dono (IDOR)', async () => {
      pets.findById.mockResolvedValue(makePet('user-2'))
      const useCase = new UpdatePetUseCase(pets, audit, invalidation)

      await expect(
        useCase.execute('user-1', 'pet-Thor', { name: 'Hack' }),
      ).rejects.toThrow(PetOwnerMismatchError)
      expect(invalidation.invalidateByPetId).not.toHaveBeenCalled()
    })
  })

  describe('DeletePetUseCase', () => {
    it('faz soft delete do próprio pet', async () => {
      const pet = makePet('user-1')
      pets.findById.mockResolvedValue(pet)
      const useCase = new DeletePetUseCase(pets, audit, invalidation)

      await useCase.execute('user-1', 'pet-Thor')

      expect(pets.save).toHaveBeenCalled()
      const saved = pets.save.mock.calls[0][0]
      expect(saved.deletedAt).not.toBeNull()
      expect(invalidation.invalidateByPetId).toHaveBeenCalledWith('pet-Thor')
    })

    it('rejeita pet de outro dono', async () => {
      pets.findById.mockResolvedValue(makePet('user-2'))
      const useCase = new DeletePetUseCase(pets, audit, invalidation)

      await expect(useCase.execute('user-1', 'pet-Thor')).rejects.toThrow(
        PetOwnerMismatchError,
      )
      expect(invalidation.invalidateByPetId).not.toHaveBeenCalled()
    })
  })

  describe('SetLostStatusUseCase', () => {
    it('marca como perdido', async () => {
      const pet = makePet('user-1')
      pets.findById.mockResolvedValue(pet)
      const useCase = new SetLostStatusUseCase(pets, audit, invalidation)

      const result = await useCase.execute('user-1', 'pet-Thor', true)
      expect(result.lostStatus).toBe(true)
      expect(invalidation.invalidateByPetId).toHaveBeenCalledWith('pet-Thor')
    })

    it('marca como encontrado', async () => {
      const pet = makePet('user-1')
      pet.markLost()
      pets.findById.mockResolvedValue(pet)
      const useCase = new SetLostStatusUseCase(pets, audit, invalidation)

      const result = await useCase.execute('user-1', 'pet-Thor', false)
      expect(result.lostStatus).toBe(false)
      expect(invalidation.invalidateByPetId).toHaveBeenCalledWith('pet-Thor')
    })

    it('rejeita pet de outro dono', async () => {
      pets.findById.mockResolvedValue(makePet('user-2'))
      const useCase = new SetLostStatusUseCase(pets, audit, invalidation)

      await expect(useCase.execute('user-1', 'pet-Thor', true)).rejects.toThrow(
        PetOwnerMismatchError,
      )
      expect(invalidation.invalidateByPetId).not.toHaveBeenCalled()
    })
  })

  describe('UpdatePrivacyUseCase', () => {
    it('atualiza privacidade do próprio pet', async () => {
      const pet = makePet('user-1')
      pets.findById.mockResolvedValue(pet)
      const useCase = new UpdatePrivacyUseCase(pets, audit, invalidation)

      const result = await useCase.execute('user-1', 'pet-Thor', {
        showEmail: true,
        showMedical: true,
      })

      expect(result.privacy.showEmail).toBe(true)
      expect(result.privacy.showMedical).toBe(true)
      expect(result.privacy.showPhone).toBe(true) // preservada
      expect(invalidation.invalidateByPetId).toHaveBeenCalledWith('pet-Thor')
    })

    it('lança PetNotFoundError se não existe', async () => {
      pets.findById.mockResolvedValue(null)
      const useCase = new UpdatePrivacyUseCase(pets, audit, invalidation)

      await expect(
        useCase.execute('user-1', 'x', { showEmail: true }),
      ).rejects.toThrow(PetNotFoundError)
      expect(invalidation.invalidateByPetId).not.toHaveBeenCalled()
    })
  })
})
