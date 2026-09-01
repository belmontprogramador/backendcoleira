import { ResetTagUseCase } from '../reset-tag.use-case'
import { TagNotFoundError } from '../../errors'
import { NfcTag, TagStatus } from '../../../domain/entities/nfc-tag.entity'
import { Batch } from '../../../domain/entities/batch.entity'
import type { NfcTagRepositoryPort } from '../../../domain/repositories/nfc-tag.repository.port'
import type { BatchRepositoryPort } from '../../../domain/repositories/batch.repository.port'
import type { AuditLoggerPort } from '../../../../../common/ports/audit-logger.port'
import { PublicId } from '../../../domain/value-objects/public-id.vo'
import { Uid } from '../../../domain/value-objects/uid.vo'

describe('ResetTagUseCase', () => {
  let tags: jest.Mocked<NfcTagRepositoryPort>
  let batches: jest.Mocked<BatchRepositoryPort>
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
      count: jest.fn(),
      save: jest.fn(),
      saveMany: jest.fn(),
      deleteByBatch: jest.fn(),
    }
    batches = {
      findById: jest.fn(),
      findByName: jest.fn(),
      list: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    }
    audit = { log: jest.fn() }
    useCase = new ResetTagUseCase(tags, batches, audit)
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

  function activeTag(): NfcTag {
    const tag = readyTag()
    tag.markInStock()
    tag.markSold()
    tag.markDelivered()
    tag.markAvailable()
    tag.activate('user-1')
    tag.associatePet('pet-1')
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

  it('reset é idempotente (tag CREATED → no-op, sem erro)', async () => {
    const tag = NfcTag.create({
      id: 'tag-1',
      publicId: PublicId.create('7F4K9M2Q'),
      activationCodeEncrypted: 'encrypted-code',
    })
    tags.findByPublicId.mockResolvedValue(tag)

    const result = await useCase.execute('operator-1', '7F4K9M2Q')

    expect(result.status).toBe(TagStatus.CREATED)
  })

  it('reset virgem total limpa owner/pet/ativação', async () => {
    const tag = activeTag()
    tags.findByPublicId.mockResolvedValue(tag)

    const result = await useCase.execute('operator-1', '7F4K9M2Q')

    expect(result.status).toBe(TagStatus.CREATED)
    expect(result.ownerId).toBeNull()
    expect(result.petId).toBeNull()
    expect(result.activatedAt).toBeNull()
  })

  it('decrementa written_count quando reseta uma tag READY', async () => {
    const tag = readyTag()
    const batch = Batch.create({
      id: 'batch-1',
      name: 'Lote',
      quantity: 10,
      createdBy: 'o',
    })
    batch.incrementWritten() // a tag foi gravada
    tags.findByPublicId.mockResolvedValue(tag)
    batches.findById.mockResolvedValue(batch)

    await useCase.execute('operator-1', '7F4K9M2Q')

    const savedBatch = batches.save.mock.calls[0][0]
    expect(savedBatch.writtenCount).toBe(0)
  })

  it('não decrementa written_count se a tag não estava READY', async () => {
    const tag = NfcTag.create({
      id: 'tag-1',
      publicId: PublicId.create('7F4K9M2Q'),
      activationCodeEncrypted: 'encrypted-code',
      batchId: 'batch-1',
    })
    tags.findByPublicId.mockResolvedValue(tag)

    await useCase.execute('operator-1', '7F4K9M2Q')

    expect(batches.findById).not.toHaveBeenCalled()
  })

  it('lança TagNotFoundError se a tag não existe', async () => {
    tags.findByPublicId.mockResolvedValue(null)

    await expect(useCase.execute('operator-1', 'NAOEXISTE')).rejects.toThrow(
      TagNotFoundError,
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
