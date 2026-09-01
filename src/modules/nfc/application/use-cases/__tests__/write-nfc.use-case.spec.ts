import { WriteNfcUseCase } from '../write-nfc.use-case'
import {
  TagNotFoundError,
  DuplicateUidError,
  WriteNfcFailedError,
} from '../../errors'
import type { NfcTagRepositoryPort } from '../../../domain/repositories/nfc-tag.repository.port'
import type { BatchRepositoryPort } from '../../../domain/repositories/batch.repository.port'
import type { NfcWriterPort } from '../../../domain/services/nfc-writer.port'
import type { NfcReaderPort } from '../../../domain/services/nfc-reader.port'
import type { PublicBaseUrlPort } from '../../../domain/services/public-base-url.port'
import type { AuditLoggerPort } from '../../../../../common/ports/audit-logger.port'
import { NfcTag } from '../../../domain/entities/nfc-tag.entity'
import { Batch, BatchStatus } from '../../../domain/entities/batch.entity'
import { PublicId } from '../../../domain/value-objects/public-id.vo'

describe('WriteNfcUseCase', () => {
  let tags: jest.Mocked<NfcTagRepositoryPort>
  let batches: jest.Mocked<BatchRepositoryPort>
  let writer: jest.Mocked<NfcWriterPort>
  let reader: jest.Mocked<NfcReaderPort>
  let baseUrl: jest.Mocked<PublicBaseUrlPort>
  let audit: jest.Mocked<AuditLoggerPort>
  let useCase: WriteNfcUseCase

  const URL = 'https://dominio.com/p/7F4K9M2Q'

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
    batches = {
      findById: jest.fn(),
      findByName: jest.fn(),
      list: jest.fn(),
      save: jest.fn(),
    }
    writer = { write: jest.fn() }
    reader = { read: jest.fn() }
    baseUrl = { buildProfileUrl: jest.fn(() => URL) }
    audit = { log: jest.fn() }
    useCase = new WriteNfcUseCase(tags, batches, writer, reader, baseUrl, audit)
  })

  function createdTag(): NfcTag {
    return NfcTag.create({
      id: 'tag-1',
      publicId: PublicId.create('7F4K9M2Q'),
      activationCodeEncrypted: 'encrypted',
      batchId: 'batch-1',
    })
  }

  function generatedBatch(): Batch {
    const batch = Batch.create({
      id: 'batch-1',
      name: 'Lote 001',
      quantity: 10,
      createdBy: 'operator-1',
    })
    batch.startGenerating()
    batch.finishGeneration(10)
    return batch
  }

  it('grava com sucesso (write→read→compare) e marca READY', async () => {
    const tag = createdTag()
    tags.findByPublicId.mockResolvedValue(tag)
    tags.findByUid.mockResolvedValue(null)
    writer.write.mockResolvedValue(true)
    reader.read.mockResolvedValue(URL)

    const result = await useCase.execute(
      'operator-1',
      '7F4K9M2Q',
      '04:A7:32:91:8B:1F',
    )

    expect(result.status).toBe('READY')
    expect(result.uid?.value).toBe('04:A7:32:91:8B:1F')
    expect(writer.write).toHaveBeenCalledWith('04:A7:32:91:8B:1F', URL)
    expect(reader.read).toHaveBeenCalledWith('04:A7:32:91:8B:1F')
    expect(tags.save).toHaveBeenCalled()
  })

  it('rejeita UID já associado a outra tag', async () => {
    const other = NfcTag.create({
      id: 'tag-other',
      publicId: PublicId.create('BBBBBBB3'),
      activationCodeEncrypted: 'encrypted',
      batchId: 'batch-1',
    })
    tags.findByPublicId.mockResolvedValue(createdTag())
    tags.findByUid.mockResolvedValue(other)

    await expect(
      useCase.execute('operator-1', '7F4K9M2Q', '04:A7:32:91:8B:1F'),
    ).rejects.toThrow(DuplicateUidError)
    expect(writer.write).not.toHaveBeenCalled()
  })

  it('falha após 3 tentativas (URL não coincide)', async () => {
    const tag = createdTag()
    tags.findByPublicId.mockResolvedValue(tag)
    tags.findByUid.mockResolvedValue(null)
    writer.write.mockResolvedValue(true)
    reader.read.mockResolvedValue('https://dominio.com/p/ERRADA')

    await expect(
      useCase.execute('operator-1', '7F4K9M2Q', '04:A7:32:91:8B:1F'),
    ).rejects.toThrow(WriteNfcFailedError)

    // 3 tentativas de write + read
    expect(writer.write).toHaveBeenCalledTimes(3)
    expect(reader.read).toHaveBeenCalledTimes(3)
  })

  it('recupera na 2ª tentativa', async () => {
    const tag = createdTag()
    tags.findByPublicId.mockResolvedValue(tag)
    tags.findByUid.mockResolvedValue(null)
    writer.write.mockResolvedValue(true)
    reader.read
      .mockResolvedValueOnce('https://dominio.com/p/ERRADA')
      .mockResolvedValueOnce(URL)

    const result = await useCase.execute(
      'operator-1',
      '7F4K9M2Q',
      '04:A7:32:91:8B:1F',
    )

    expect(result.status).toBe('READY')
    expect(writer.write).toHaveBeenCalledTimes(2)
  })

  it('lança TagNotFoundError se tag não existe', async () => {
    tags.findByPublicId.mockResolvedValue(null)

    await expect(
      useCase.execute('operator-1', 'NAOEXISTE', '04:A7:32:91:8B:1F'),
    ).rejects.toThrow(TagNotFoundError)
  })

  it('audita a gravação com sucesso', async () => {
    const tag = createdTag()
    tags.findByPublicId.mockResolvedValue(tag)
    tags.findByUid.mockResolvedValue(null)
    writer.write.mockResolvedValue(true)
    reader.read.mockResolvedValue(URL)

    await useCase.execute('operator-1', '7F4K9M2Q', '04:A7:32:91:8B:1F')

    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'tag_write' }),
    )
  })

  it('transiciona o lote GENERATED → WRITING na primeira gravação', async () => {
    const tag = createdTag()
    const batch = generatedBatch()
    tags.findByPublicId.mockResolvedValue(tag)
    tags.findByUid.mockResolvedValue(null)
    batches.findById.mockResolvedValue(batch)
    writer.write.mockResolvedValue(true)
    reader.read.mockResolvedValue(URL)

    await useCase.execute('operator-1', '7F4K9M2Q', '04:A7:32:91:8B:1F')

    const savedBatch = batches.save.mock.calls[0][0]
    expect(savedBatch.status).toBe(BatchStatus.WRITING)
    expect(savedBatch.writtenCount).toBe(1)
  })
})
