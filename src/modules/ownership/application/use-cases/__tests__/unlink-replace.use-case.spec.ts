import { UnlinkTagUseCase } from '../unlink-tag.use-case'
import { ReplaceTagUseCase } from '../replace-tag.use-case'
import {
  TagNotFoundError,
  TagNotOwnedError,
  TagNotActiveError,
} from '../../errors'
import type { NfcTagRepositoryPort } from '../../../../nfc/domain/repositories/nfc-tag.repository.port'
import type { AuditLoggerPort } from '../../../../../common/ports/audit-logger.port'
import type { PublicProfileInvalidationPort } from '../../../../../common/ports/public-profile-invalidation.port'
import {
  NfcTag,
  TagStatus,
} from '../../../../nfc/domain/entities/nfc-tag.entity'
import { PublicId } from '../../../../nfc/domain/value-objects/public-id.vo'
import { Uid } from '../../../../nfc/domain/value-objects/uid.vo'

describe('Ownership — desvinculação e substituição', () => {
  let tags: jest.Mocked<NfcTagRepositoryPort>
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
      count: jest.fn(),
      save: jest.fn(),
      saveMany: jest.fn(),
    }
    audit = { log: jest.fn() }
    invalidation = {
      invalidateByPublicId: jest.fn(),
      invalidateByPetId: jest.fn(),
    }
  })

  function activeTag(
    ownerId = 'user-1',
    petId: string | null = 'pet-1',
  ): NfcTag {
    const tag = NfcTag.create({
      id: 'tag-1',
      publicId: PublicId.create('7F4K9M2Q'),
      activationCodeEncrypted: 'encrypted-code',
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

  describe('UnlinkTagUseCase', () => {
    it('desvincula e MANTÉM o código de ativação (identidade preservada)', async () => {
      const tag = activeTag()
      tags.findById.mockResolvedValue(tag)
      const useCase = new UnlinkTagUseCase(tags, audit, invalidation)

      const result = await useCase.execute('user-1', 'tag-1')

      expect(result.status).toBe(TagStatus.AVAILABLE)
      expect(result.ownerId).toBeNull()
      expect(result.petId).toBeNull()
      // identidade (publicId + código criptografado) permanece a mesma
      expect(result.publicId.value).toBe('7F4K9M2Q')
      expect(result.activationCodeEncrypted).toBe('encrypted-code')
      expect(invalidation.invalidateByPublicId).toHaveBeenCalledWith('7F4K9M2Q')
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'tag_unlink' }),
      )
    })

    it('rejeita tag de outro dono (IDOR)', async () => {
      tags.findById.mockResolvedValue(activeTag('user-2'))
      const useCase = new UnlinkTagUseCase(tags, audit, invalidation)

      await expect(useCase.execute('user-1', 'tag-1')).rejects.toThrow(
        TagNotOwnedError,
      )
    })

    it('rejeita tag não ativa', async () => {
      const tag = activeTag()
      const suspended = NfcTag.reconstitute({
        id: tag.id,
        publicId: tag.publicId,
        uid: tag.uid,
        activationCodeEncrypted: tag.activationCodeEncrypted,
        status: TagStatus.SUSPENDED,
        batchId: tag.batchId,
        ownerId: 'user-1',
        petId: 'pet-1',
        activatedAt: tag.activatedAt,
        deactivatedAt: null,
        resetAt: null,
        createdAt: tag.createdAt,
        updatedAt: tag.updatedAt,
      })
      tags.findById.mockResolvedValue(suspended)
      const useCase = new UnlinkTagUseCase(tags, audit, invalidation)

      await expect(useCase.execute('user-1', 'tag-1')).rejects.toThrow(
        TagNotActiveError,
      )
    })
  })

  describe('ReplaceTagUseCase', () => {
    function availableNewTag(): NfcTag {
      const tag = NfcTag.create({
        id: 'tag-2',
        publicId: PublicId.create('BBBBBBB3'),
        activationCodeEncrypted: 'new-tag-encrypted',
      })
      tag.markWritten(Uid.create('05:B8:43:02:9C:2F'))
      tag.markInStock()
      tag.markSold()
      tag.markDelivered()
      return tag
    }

    it('substitui: nova tag aponta pro mesmo pet, velha aposenta', async () => {
      const oldTag = activeTag('user-1', 'pet-1')
      const newTag = availableNewTag()
      tags.findById.mockResolvedValueOnce(oldTag).mockResolvedValueOnce(newTag)
      const useCase = new ReplaceTagUseCase(tags, audit, invalidation)

      const result = await useCase.execute('user-1', 'tag-1', 'tag-2')

      expect(result.id).toBe('tag-2')
      expect(result.ownerId).toBe('user-1')
      expect(result.petId).toBe('pet-1')
      expect(result.status).toBe(TagStatus.ACTIVE)

      const savedOld = tags.save.mock.calls.find(
        c => c[0].id === 'tag-1',
      )?.[0] as NfcTag
      expect(savedOld.status).toBe(TagStatus.RETIRED)
      expect(savedOld.ownerId).toBeNull()
      expect(savedOld.petId).toBeNull()
      expect(invalidation.invalidateByPublicId).toHaveBeenCalledWith('7F4K9M2Q')
      expect(invalidation.invalidateByPublicId).toHaveBeenCalledWith('BBBBBBB3')
    })

    it('rejeita old tag de outro dono (IDOR)', async () => {
      const oldTag = activeTag('user-2')
      tags.findById.mockResolvedValue(oldTag)
      const useCase = new ReplaceTagUseCase(tags, audit, invalidation)

      await expect(useCase.execute('user-1', 'tag-1', 'tag-2')).rejects.toThrow(
        TagNotOwnedError,
      )
    })

    it('lança TagNotFoundError se old tag não existe', async () => {
      tags.findById.mockResolvedValue(null)
      const useCase = new ReplaceTagUseCase(tags, audit, invalidation)

      await expect(useCase.execute('user-1', 'x', 'tag-2')).rejects.toThrow(
        TagNotFoundError,
      )
    })
  })
})
