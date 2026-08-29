import { ActivateTagUseCase } from '../activate-tag.use-case'
import {
  TagNotFoundError,
  ActivationCodeMismatchError,
  TagAlreadyActivatedError,
} from '../../errors'
import type { NfcTagRepositoryPort } from '../../../../nfc/domain/repositories/nfc-tag.repository.port'
import type { ActivationCodeCipherPort } from '../../../../nfc/domain/services/activation-code-cipher.port'
import type { AuditLoggerPort } from '../../../../../common/ports/audit-logger.port'
import type { PublicProfileInvalidationPort } from '../../../../../common/ports/public-profile-invalidation.port'
import {
  NfcTag,
  TagStatus,
} from '../../../../nfc/domain/entities/nfc-tag.entity'
import { PublicId } from '../../../../nfc/domain/value-objects/public-id.vo'
import { Uid } from '../../../../nfc/domain/value-objects/uid.vo'

describe('ActivateTagUseCase', () => {
  let tags: jest.Mocked<NfcTagRepositoryPort>
  let cipher: jest.Mocked<ActivationCodeCipherPort>
  let audit: jest.Mocked<AuditLoggerPort>
  let invalidation: jest.Mocked<PublicProfileInvalidationPort>
  let useCase: ActivateTagUseCase

  beforeEach(() => {
    tags = {
      findById: jest.fn(),
      findByPublicId: jest.fn(),
      findByUid: jest.fn(),
      findNextToWrite: jest.fn(),
      listByBatch: jest.fn(),
      listByPet: jest.fn(),
      list: jest.fn(),
      save: jest.fn(),
      saveMany: jest.fn(),
    }
    cipher = { encrypt: jest.fn(), decrypt: jest.fn() }
    audit = { log: jest.fn() }
    invalidation = {
      invalidateByPublicId: jest.fn(),
      invalidateByPetId: jest.fn(),
    }
    useCase = new ActivateTagUseCase(tags, cipher, audit, invalidation)
  })

  function availableTag(): NfcTag {
    const tag = NfcTag.create({
      id: 'tag-1',
      publicId: PublicId.create('7F4K9M2Q'),
      activationCodeEncrypted: 'encrypted-code',
      batchId: 'batch-1',
    })
    tag.markWritten(Uid.create('04:A7:32:91:8B:1F'))
    tag.markInStock()
    tag.markSold()
    tag.markDelivered()
    tag.markAvailable()
    return tag
  }

  it('ativa um pingente AVAILABLE com código correto', async () => {
    const tag = availableTag()
    tags.findByPublicId.mockResolvedValue(tag)
    cipher.decrypt.mockReturnValue('X8P4-L2Q9')

    const result = await useCase.execute('user-1', '7F4K9M2Q', 'X8P4-L2Q9')

    expect(result.status).toBe(TagStatus.ACTIVE)
    expect(result.ownerId).toBe('user-1')
    expect(result.activatedAt).not.toBeNull()
    expect(cipher.decrypt).toHaveBeenCalledWith('encrypted-code')
    expect(tags.save).toHaveBeenCalled()
    expect(invalidation.invalidateByPublicId).toHaveBeenCalledWith('7F4K9M2Q')
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'tag_activate' }),
    )
  })

  it('aceita código com letras minúsculas (normaliza)', async () => {
    const tag = availableTag()
    tags.findByPublicId.mockResolvedValue(tag)
    cipher.decrypt.mockReturnValue('X8P4-L2Q9')

    const result = await useCase.execute('user-1', '7F4K9M2Q', 'x8p4-l2q9')

    expect(result.status).toBe(TagStatus.ACTIVE)
  })

  it('ativa um pingente DELIVERED (transição automática)', async () => {
    const tag = availableTag()
    const delivered = NfcTag.reconstitute({
      id: tag.id,
      publicId: tag.publicId,
      uid: tag.uid,
      activationCodeEncrypted: tag.activationCodeEncrypted,
      status: TagStatus.DELIVERED,
      batchId: tag.batchId,
      ownerId: null,
      petId: null,
      activatedAt: null,
      deactivatedAt: null,
      createdAt: tag.createdAt,
      updatedAt: tag.updatedAt,
    })
    tags.findByPublicId.mockResolvedValue(delivered)
    cipher.decrypt.mockReturnValue('X8P4-L2Q9')

    const result = await useCase.execute('user-1', '7F4K9M2Q', 'X8P4-L2Q9')

    expect(result.status).toBe(TagStatus.ACTIVE)
  })

  it('rejeita código inválido', async () => {
    const tag = availableTag()
    tags.findByPublicId.mockResolvedValue(tag)
    cipher.decrypt.mockReturnValue('X8P4-L2Q9')

    await expect(
      useCase.execute('user-1', '7F4K9M2Q', 'WRONG-CODE'),
    ).rejects.toThrow(ActivationCodeMismatchError)
    expect(tags.save).not.toHaveBeenCalled()
  })

  it('rejeita pingente já ativado', async () => {
    const tag = availableTag()
    tag.activate('user-2')
    tags.findByPublicId.mockResolvedValue(tag)
    cipher.decrypt.mockReturnValue('X8P4-L2Q9')

    await expect(
      useCase.execute('user-1', '7F4K9M2Q', 'X8P4-L2Q9'),
    ).rejects.toThrow(TagAlreadyActivatedError)
  })

  it('lança TagNotFoundError se não existe', async () => {
    tags.findByPublicId.mockResolvedValue(null)

    await expect(
      useCase.execute('user-1', 'NAOEXISTE', 'X8P4-L2Q9'),
    ).rejects.toThrow(TagNotFoundError)
  })

  it('registra tentativa falha na auditoria', async () => {
    const tag = availableTag()
    tags.findByPublicId.mockResolvedValue(tag)
    cipher.decrypt.mockReturnValue('X8P4-L2Q9')

    await expect(
      useCase.execute('user-1', '7F4K9M2Q', 'ERRADO'),
    ).rejects.toThrow(ActivationCodeMismatchError)

    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'tag_activate_failed' }),
    )
  })
})
