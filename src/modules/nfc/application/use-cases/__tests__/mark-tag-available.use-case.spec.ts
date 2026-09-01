import { MarkTagAvailableUseCase } from '../mark-tag-available.use-case'
import { TagNotFoundError } from '../../errors'
import { NfcTag, TagStatus } from '../../../domain/entities/nfc-tag.entity'
import type { NfcTagRepositoryPort } from '../../../domain/repositories/nfc-tag.repository.port'
import type { AuditLoggerPort } from '../../../../../common/ports/audit-logger.port'
import { PublicId } from '../../../domain/value-objects/public-id.vo'
import { Uid } from '../../../domain/value-objects/uid.vo'

describe('MarkTagAvailableUseCase', () => {
  let tags: jest.Mocked<NfcTagRepositoryPort>
  let audit: jest.Mocked<AuditLoggerPort>
  let useCase: MarkTagAvailableUseCase

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
    useCase = new MarkTagAvailableUseCase(tags, audit)
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

  it('READY → AVAILABLE (Opção A)', async () => {
    const tag = readyTag()
    tags.findByPublicId.mockResolvedValue(tag)

    const result = await useCase.execute('operator-1', '7F4K9M2Q')

    expect(result.status).toBe(TagStatus.AVAILABLE)
    expect(tags.save).toHaveBeenCalledWith(tag)
  })

  it('é idempotente (AVAILABLE → AVAILABLE, sem erro)', async () => {
    const tag = readyTag()
    tag.markAvailable()
    tags.findByPublicId.mockResolvedValue(tag)

    const result = await useCase.execute('operator-1', '7F4K9M2Q')

    expect(result.status).toBe(TagStatus.AVAILABLE)
    expect(tags.save).toHaveBeenCalledWith(tag)
  })

  it('lança TagNotFoundError se a tag não existe', async () => {
    tags.findByPublicId.mockResolvedValue(null)

    await expect(useCase.execute('operator-1', 'NAOEXISTE')).rejects.toThrow(
      TagNotFoundError,
    )
  })

  it('audita a ação', async () => {
    const tag = readyTag()
    tags.findByPublicId.mockResolvedValue(tag)

    await useCase.execute('operator-1', '7F4K9M2Q')

    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'tag_mark_available' }),
    )
  })
})
