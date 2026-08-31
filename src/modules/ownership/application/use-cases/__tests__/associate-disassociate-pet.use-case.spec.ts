import { AssociatePetUseCase } from '../associate-pet.use-case'
import { DisassociatePetUseCase } from '../disassociate-pet.use-case'
import {
  TagNotFoundError,
  TagNotOwnedError,
  PetNotFoundError,
  PetOwnerMismatchError,
  PetAlreadyAssociatedError,
  TagAlreadyAssociatedError,
  NoPetAssociatedError,
  TagNotActiveError,
} from '../../errors'
import type { NfcTagRepositoryPort } from '../../../../nfc/domain/repositories/nfc-tag.repository.port'
import type { PetRepositoryPort } from '../../../../pets/domain/repositories/pet.repository.port'
import type { AuditLoggerPort } from '../../../../../common/ports/audit-logger.port'
import type { PublicProfileInvalidationPort } from '../../../../../common/ports/public-profile-invalidation.port'
import {
  NfcTag,
  TagStatus,
} from '../../../../nfc/domain/entities/nfc-tag.entity'
import { PublicId } from '../../../../nfc/domain/value-objects/public-id.vo'
import { Uid } from '../../../../nfc/domain/value-objects/uid.vo'
import { Pet } from '../../../../pets/domain/entities/pet.entity'
import { PetSpecies } from '../../../../pets/domain/value-objects/pet-species.vo'

describe('Ownership — associação/desassociação de pet', () => {
  let tags: jest.Mocked<NfcTagRepositoryPort>
  let pets: jest.Mocked<PetRepositoryPort>
  let audit: jest.Mocked<AuditLoggerPort>
  let invalidation: jest.Mocked<PublicProfileInvalidationPort>

  beforeEach(() => {
    tags = {
      findById: jest.fn(),
      findByPublicId: jest.fn(),
      findByUid: jest.fn(),
      findNextToWrite: jest.fn(),
      listByBatch: jest.fn(),
      listByPet: jest.fn(),

      listUnactivated: jest.fn(),
      list: jest.fn(),
      save: jest.fn(),
      saveMany: jest.fn(),
    }
    pets = {
      findById: jest.fn(),
      listByOwner: jest.fn(),
      listAll: jest.fn(),
      save: jest.fn(),
    }
    audit = { log: jest.fn() }
    invalidation = {
      invalidateByPublicId: jest.fn(),
      invalidateByPetId: jest.fn(),
    }
  })

  function activeTag(ownerId = 'user-1', petId: string | null = null): NfcTag {
    const tag = NfcTag.create({
      id: 'tag-1',
      publicId: PublicId.create('7F4K9M2Q'),
      activationCodeEncrypted: 'encrypted',
    })
    tag.markWritten(Uid.create('04:A7:32:91:8B:1F'))
    tag.markInStock()
    tag.markSold()
    tag.markDelivered()
    tag.activate(ownerId)
    if (petId) {
      tag.associatePet(petId)
    }
    return tag
  }

  function makePet(ownerId = 'user-1'): Pet {
    return Pet.create({
      id: 'pet-1',
      ownerId,
      name: 'Thor',
      species: PetSpecies.create('Cão'),
    })
  }

  describe('AssociatePetUseCase', () => {
    it('associa um pet do dono a uma tag ativa', async () => {
      tags.findById.mockResolvedValue(activeTag())
      pets.findById.mockResolvedValue(makePet())
      const useCase = new AssociatePetUseCase(tags, pets, audit, invalidation)

      const result = await useCase.execute('user-1', 'tag-1', 'pet-1')

      expect(result.petId).toBe('pet-1')
      expect(tags.save).toHaveBeenCalled()
      expect(invalidation.invalidateByPublicId).toHaveBeenCalledWith('7F4K9M2Q')
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'tag_associate_pet' }),
      )
    })

    it('rejeita tag de outro dono (IDOR)', async () => {
      tags.findById.mockResolvedValue(activeTag('user-2'))
      pets.findById.mockResolvedValue(makePet('user-1'))
      const useCase = new AssociatePetUseCase(tags, pets, audit, invalidation)

      await expect(useCase.execute('user-1', 'tag-1', 'pet-1')).rejects.toThrow(
        TagNotOwnedError,
      )
    })

    it('rejeita pet de outro dono', async () => {
      tags.findById.mockResolvedValue(activeTag())
      pets.findById.mockResolvedValue(makePet('user-2'))
      const useCase = new AssociatePetUseCase(tags, pets, audit, invalidation)

      await expect(useCase.execute('user-1', 'tag-1', 'pet-1')).rejects.toThrow(
        PetOwnerMismatchError,
      )
    })

    it('rejeita tag não ativa', async () => {
      const tag = activeTag()
      // simula tag SUSPENDED (do dono, mas não ACTIVE)
      const suspended = NfcTag.reconstitute({
        id: tag.id,
        publicId: tag.publicId,
        uid: tag.uid,
        activationCodeEncrypted: tag.activationCodeEncrypted,
        status: TagStatus.SUSPENDED,
        batchId: tag.batchId,
        ownerId: 'user-1',
        petId: null,
        activatedAt: tag.activatedAt,
        deactivatedAt: null,
        createdAt: tag.createdAt,
        updatedAt: tag.updatedAt,
      })
      tags.findById.mockResolvedValue(suspended)
      pets.findById.mockResolvedValue(makePet())
      const useCase = new AssociatePetUseCase(tags, pets, audit, invalidation)

      await expect(useCase.execute('user-1', 'tag-1', 'pet-1')).rejects.toThrow(
        TagNotActiveError,
      )
    })

    it('rejeita tag que já tem pet associado', async () => {
      tags.findById.mockResolvedValue(activeTag('user-1', 'pet-999'))
      pets.findById.mockResolvedValue(makePet())
      const useCase = new AssociatePetUseCase(tags, pets, audit, invalidation)

      await expect(useCase.execute('user-1', 'tag-1', 'pet-1')).rejects.toThrow(
        TagAlreadyAssociatedError,
      )
    })

    it('lança TagNotFoundError / PetNotFoundError', async () => {
      const useCase = new AssociatePetUseCase(tags, pets, audit, invalidation)
      tags.findById.mockResolvedValue(null)

      await expect(useCase.execute('user-1', 'x', 'pet-1')).rejects.toThrow(
        TagNotFoundError,
      )

      tags.findById.mockResolvedValue(activeTag())
      pets.findById.mockResolvedValue(null)
      await expect(useCase.execute('user-1', 'tag-1', 'x')).rejects.toThrow(
        PetNotFoundError,
      )
    })
  })

  describe('DisassociatePetUseCase', () => {
    it('desassocia o pet de uma tag ativa do dono', async () => {
      tags.findById.mockResolvedValue(activeTag('user-1', 'pet-1'))
      const useCase = new DisassociatePetUseCase(tags, audit, invalidation)

      const result = await useCase.execute('user-1', 'tag-1')

      expect(result.petId).toBeNull()
      expect(tags.save).toHaveBeenCalled()
      expect(invalidation.invalidateByPublicId).toHaveBeenCalledWith('7F4K9M2Q')
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'tag_disassociate_pet' }),
      )
    })

    it('rejeita tag sem pet associado', async () => {
      tags.findById.mockResolvedValue(activeTag())
      const useCase = new DisassociatePetUseCase(tags, audit, invalidation)

      await expect(useCase.execute('user-1', 'tag-1')).rejects.toThrow(
        NoPetAssociatedError,
      )
    })

    it('rejeita tag de outro dono (IDOR)', async () => {
      tags.findById.mockResolvedValue(activeTag('user-2', 'pet-1'))
      const useCase = new DisassociatePetUseCase(tags, audit, invalidation)

      await expect(useCase.execute('user-1', 'tag-1')).rejects.toThrow(
        TagNotOwnedError,
      )
    })
  })
})
