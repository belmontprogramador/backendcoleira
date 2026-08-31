import { ActivateTagByCodeUseCase } from '../activate-tag-by-code.use-case'
import {
  ActivationCodeMismatchError,
  PetNotFoundError,
  PetOwnerMismatchError,
  TagAlreadyActivatedError,
} from '../../errors'
import type { NfcTagRepositoryPort } from '../../../../nfc/domain/repositories/nfc-tag.repository.port'
import type { ActivationCodeCipherPort } from '../../../../nfc/domain/services/activation-code-cipher.port'
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

describe('ActivateTagByCodeUseCase', () => {
  let tags: jest.Mocked<NfcTagRepositoryPort>
  let cipher: jest.Mocked<ActivationCodeCipherPort>
  let pets: jest.Mocked<PetRepositoryPort>
  let audit: jest.Mocked<AuditLoggerPort>
  let invalidation: jest.Mocked<PublicProfileInvalidationPort>
  let useCase: ActivateTagByCodeUseCase

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
    cipher = { encrypt: jest.fn(), decrypt: jest.fn() }
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
    useCase = new ActivateTagByCodeUseCase(
      tags,
      cipher,
      pets,
      audit,
      invalidation,
    )
  })

  function availableTag(id = 'tag-1', publicIdValue = '7F4K9M2Q'): NfcTag {
    const tag = NfcTag.create({
      id,
      publicId: PublicId.create(publicIdValue),
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

  function makePet(ownerId = 'user-1'): Pet {
    return Pet.create({
      id: 'pet-1',
      ownerId,
      name: 'Thor',
      species: PetSpecies.create('Cão'),
    })
  }

  it('ativa pelo código e associa ao pet do dono', async () => {
    const tag = availableTag()
    tags.listUnactivated.mockResolvedValue([tag])
    cipher.decrypt.mockReturnValue('X8P4-L2Q9')
    pets.findById.mockResolvedValue(makePet())

    const result = await useCase.execute('user-1', 'X8P4-L2Q9', 'pet-1')

    expect(result.status).toBe(TagStatus.ACTIVE)
    expect(result.ownerId).toBe('user-1')
    expect(result.petId).toBe('pet-1')
    expect(cipher.decrypt).toHaveBeenCalledWith('encrypted-code')
    expect(tags.save).toHaveBeenCalled()
    expect(invalidation.invalidateByPublicId).toHaveBeenCalledWith('7F4K9M2Q')
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'tag_activate_by_code' }),
    )
  })

  it('aceita código com letras minúsculas (normaliza)', async () => {
    const tag = availableTag()
    tags.listUnactivated.mockResolvedValue([tag])
    cipher.decrypt.mockReturnValue('X8P4-L2Q9')
    pets.findById.mockResolvedValue(makePet())

    const result = await useCase.execute('user-1', 'x8p4-l2q9', 'pet-1')

    expect(result.status).toBe(TagStatus.ACTIVE)
  })

  it('encontra o tag certo entre vários candidatos', async () => {
    const other = availableTag('tag-2', 'AAAA2222')
    const match = availableTag('tag-3', 'BBBB3333')
    tags.listUnactivated.mockResolvedValue([other, match])
    cipher.decrypt
      .mockReturnValueOnce('WRONG-CODE')
      .mockReturnValueOnce('X8P4-L2Q9')
    pets.findById.mockResolvedValue(makePet())

    const result = await useCase.execute('user-1', 'X8P4-L2Q9', 'pet-1')

    expect(result.id).toBe('tag-3')
    expect(cipher.decrypt).toHaveBeenCalledTimes(2)
  })

  it('rejeita código inválido (mesmo erro genérico, sem vazar)', async () => {
    const tag = availableTag()
    tags.listUnactivated.mockResolvedValue([tag])
    cipher.decrypt.mockReturnValue('X8P4-L2Q9')
    pets.findById.mockResolvedValue(makePet())

    await expect(
      useCase.execute('user-1', 'WRONG-CODE', 'pet-1'),
    ).rejects.toThrow(ActivationCodeMismatchError)
    expect(tags.save).not.toHaveBeenCalled()
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'tag_activate_by_code_failed' }),
    )
  })

  it('rejeita quando não há tag candidato', async () => {
    tags.listUnactivated.mockResolvedValue([])
    pets.findById.mockResolvedValue(makePet())

    await expect(
      useCase.execute('user-1', 'X8P4-L2Q9', 'pet-1'),
    ).rejects.toThrow(ActivationCodeMismatchError)
    expect(cipher.decrypt).not.toHaveBeenCalled()
  })

  it('rejeita pet de outro dono (IDOR)', async () => {
    const tag = availableTag()
    tags.listUnactivated.mockResolvedValue([tag])
    cipher.decrypt.mockReturnValue('X8P4-L2Q9')
    pets.findById.mockResolvedValue(makePet('user-2'))

    await expect(
      useCase.execute('user-1', 'X8P4-L2Q9', 'pet-1'),
    ).rejects.toThrow(PetOwnerMismatchError)
  })

  it('lança PetNotFoundError se o pet não existe', async () => {
    const tag = availableTag()
    tags.listUnactivated.mockResolvedValue([tag])
    cipher.decrypt.mockReturnValue('X8P4-L2Q9')
    pets.findById.mockResolvedValue(null)

    await expect(
      useCase.execute('user-1', 'X8P4-L2Q9', 'nao-existe'),
    ).rejects.toThrow(PetNotFoundError)
  })

  it('rejeita tag que já foi ativada (defesa em profundidade)', async () => {
    const tag = availableTag()
    tag.activate('user-9')
    tags.listUnactivated.mockResolvedValue([tag])
    cipher.decrypt.mockReturnValue('X8P4-L2Q9')
    pets.findById.mockResolvedValue(makePet())

    await expect(
      useCase.execute('user-1', 'X8P4-L2Q9', 'pet-1'),
    ).rejects.toThrow(TagAlreadyActivatedError)
  })
})
