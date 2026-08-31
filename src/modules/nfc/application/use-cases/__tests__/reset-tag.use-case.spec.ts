import { ResetTagUseCase } from '../reset-tag.use-case'
import { TagNotFoundError } from '../../errors'
import {
  InvalidTagStatusTransitionError,
  NfcTag,
  TagStatus,
} from '../../../domain/entities/nfc-tag.entity'
import type { NfcTagRepositoryPort } from '../../../domain/repositories/nfc-tag.repository.port'
import type { AuditLoggerPort } from '../../../../../common/ports/audit-logger.port'
import { PublicId } from '../../../domain/value-objects/public-id.vo'
import { Uid } from '../../../domain/value-objects/uid.vo'

describe('ResetTagUseCase', () => {
  let tags: jest.Mocked<NfcTagRepositoryPort>
  let audit: jest.Mocked<AuditLoggerPort>
  let useCase: ResetTagUseCase

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
    audit = { log: jest.fn() }
    useCase = new ResetTagUseCase(tags, audit)
  })

  function readyTag(): NfcTag {
    const tag = NfcTag.create({
      id: 'tag-1',
      publicId: PublicId.create('7F4K9M2Q'),
      activationCodeEncrypted: 'encrypted-code',
      batchId: 'batch-1',
    })
    tag.markWritten(Uid.create('04:A7:32:91:8B:1F'))
    return tag
  }

  it('reset: READY → CREATED, limpa uid, mantém publicId + código', async () => {
    const tag = readyTag()
    tags.findByPublicId.mockResolvedValue(tag)

    const result = await useCase.execute('operator-1', '7F4K9M2Q')

    expect(result.status).toBe(TagStatus.CREATED)
    expect(result.uid).toBeNull()
    expect(result.publicId.value).toBe('7F4K9M2Q')
    expect(result.activationCodeEncrypted).toBe('encrypted-code')
    expect(tags.save).toHaveBeenCalledWith(tag)
  })

  it('lança TagNotFoundError se a tag não existe', async () => {
    tags.findByPublicId.mockResolvedValue(null)

    await expect(useCase.execute('operator-1', 'NAOEXISTE')).rejects.toThrow(
      TagNotFoundError,
    )
  })

  it('rejeita reset de tag não-READY (propaga InvalidTagStatusTransitionError)', async () => {
    const tag = NfcTag.create({
      id: 'tag-1',
      publicId: PublicId.create('7F4K9M2Q'),
      activationCodeEncrypted: 'encrypted-code',
    })
    tags.findByPublicId.mockResolvedValue(tag)

    await expect(useCase.execute('operator-1', '7F4K9M2Q')).rejects.toThrow(
      InvalidTagStatusTransitionError,
    )
  })

  it('audita o reset', async () => {
    const tag = readyTag()
    tags.findByPublicId.mockResolvedValue(tag)

    await useCase.execute('operator-1', '7F4K9M2Q')

    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'tag_reset' }),
    )
  })
})
