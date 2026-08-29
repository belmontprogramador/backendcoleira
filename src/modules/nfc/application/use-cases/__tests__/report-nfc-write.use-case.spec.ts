import { ReportNfcWriteUseCase } from '../report-nfc-write.use-case'
import {
  TagNotFoundError,
  DuplicateUidError,
  WriteNfcFailedError,
} from '../../errors'
import { NfcTag, TagStatus } from '../../../domain/entities/nfc-tag.entity'
import { Batch } from '../../../domain/entities/batch.entity'
import type { NfcTagRepositoryPort } from '../../../domain/repositories/nfc-tag.repository.port'
import type { BatchRepositoryPort } from '../../../domain/repositories/batch.repository.port'
import type { AuditLoggerPort } from '../../../../../common/ports/audit-logger.port'
import { PublicId } from '../../../domain/value-objects/public-id.vo'

describe('ReportNfcWriteUseCase', () => {
  let tags: jest.Mocked<NfcTagRepositoryPort>
  let batches: jest.Mocked<BatchRepositoryPort>
  let audit: jest.Mocked<AuditLoggerPort>
  let useCase: ReportNfcWriteUseCase

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
    batches = {
      findById: jest.fn(),
      findByName: jest.fn(),
      list: jest.fn(),
      save: jest.fn(),
    }
    audit = { log: jest.fn() }
    useCase = new ReportNfcWriteUseCase(tags, batches, audit)
  })

  function createdTag(): NfcTag {
    return NfcTag.create({
      id: 'tag-1',
      publicId: PublicId.create('7F4K9M2Q'),
      activationCodeEncrypted: 'encrypted-code',
      batchId: 'batch-1',
    })
  }

  function pendingBatch(): Batch {
    return Batch.create({
      id: 'batch-1',
      name: 'Lote 001',
      quantity: 10,
      createdBy: 'operator-1',
    })
  }

  it('marca READY quando matched=true (gravação ok)', async () => {
    const tag = createdTag()
    tags.findByPublicId.mockResolvedValue(tag)
    tags.findByUid.mockResolvedValue(null)

    const result = await useCase.execute(
      'operator-1',
      '7F4K9M2Q',
      '04:A7:32:91:8B:1F',
      true,
    )

    expect(result.status).toBe(TagStatus.READY)
    expect(result.uid?.value).toBe('04:A7:32:91:8B:1F')
    expect(tags.save).toHaveBeenCalledWith(tag)
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'tag_write' }),
    )
  })

  it('incrementa o contador de gravados do lote', async () => {
    const tag = createdTag()
    const batch = pendingBatch()
    tags.findByPublicId.mockResolvedValue(tag)
    tags.findByUid.mockResolvedValue(null)
    batches.findById.mockResolvedValue(batch)

    await useCase.execute('operator-1', '7F4K9M2Q', '04:A7:32:91:8B:1F', true)

    const savedBatch = batches.save.mock.calls[0][0]
    expect(savedBatch.writtenCount).toBe(1)
  })

  it('lança DuplicateUidError se o uid já é de outra tag', async () => {
    const other = NfcTag.create({
      id: 'tag-other',
      publicId: PublicId.create('BBBBBBB3'),
      activationCodeEncrypted: 'encrypted',
      batchId: 'batch-1',
    })
    tags.findByPublicId.mockResolvedValue(createdTag())
    tags.findByUid.mockResolvedValue(other)

    await expect(
      useCase.execute('operator-1', '7F4K9M2Q', '04:A7:32:91:8B:1F', true),
    ).rejects.toThrow(DuplicateUidError)
  })

  it('lança WriteNfcFailedError e incrementa failed quando matched=false', async () => {
    const tag = createdTag()
    const batch = pendingBatch()
    tags.findByPublicId.mockResolvedValue(tag)
    tags.findByUid.mockResolvedValue(null)
    batches.findById.mockResolvedValue(batch)

    await expect(
      useCase.execute('operator-1', '7F4K9M2Q', '04:A7:32:91:8B:1F', false),
    ).rejects.toThrow(WriteNfcFailedError)

    const savedBatch = batches.save.mock.calls[0][0]
    expect(savedBatch.failedCount).toBe(1)
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'tag_write_failed' }),
    )
  })

  it('lança TagNotFoundError se a tag não existe', async () => {
    tags.findByPublicId.mockResolvedValue(null)

    await expect(
      useCase.execute('operator-1', 'NAOEXISTE', '04:A7:32:91:8B:1F', true),
    ).rejects.toThrow(TagNotFoundError)
  })
})
