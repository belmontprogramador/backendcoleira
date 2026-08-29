import { randomUUID } from 'node:crypto'
import { GenerateTagsUseCase } from '../generate-tags.use-case'
import { BatchNotFoundError } from '../../errors'
import type { BatchRepositoryPort } from '../../../domain/repositories/batch.repository.port'
import type { NfcTagRepositoryPort } from '../../../domain/repositories/nfc-tag.repository.port'
import type { IdGeneratorPort } from '../../../domain/services/id-generator.port'
import type { ActivationCodeGeneratorPort } from '../../../domain/services/activation-code-generator.port'
import type { ActivationCodeCipherPort } from '../../../domain/services/activation-code-cipher.port'
import type { AuditLoggerPort } from '../../../../../common/ports/audit-logger.port'
import { Batch } from '../../../domain/entities/batch.entity'
import { PublicId } from '../../../domain/value-objects/public-id.vo'

jest.mock('node:crypto', () => ({
  randomUUID: jest.fn(() => 'tag-uuid'),
}))

describe('GenerateTagsUseCase', () => {
  let batches: jest.Mocked<BatchRepositoryPort>
  let tags: jest.Mocked<NfcTagRepositoryPort>
  let idGen: jest.Mocked<IdGeneratorPort>
  let codeGen: jest.Mocked<ActivationCodeGeneratorPort>
  let cipher: jest.Mocked<ActivationCodeCipherPort>
  let audit: jest.Mocked<AuditLoggerPort>
  let useCase: GenerateTagsUseCase

  beforeEach(() => {
    batches = {
      findById: jest.fn(),
      findByName: jest.fn(),
      list: jest.fn(),
      save: jest.fn(),
    }
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
    idGen = { generatePublicId: jest.fn() }
    codeGen = { generate: jest.fn() }
    cipher = { encrypt: jest.fn(), decrypt: jest.fn() }
    audit = { log: jest.fn() }
    useCase = new GenerateTagsUseCase(
      batches,
      tags,
      idGen,
      codeGen,
      cipher,
      audit,
    )
  })

  function pendingBatch(): Batch {
    return Batch.create({
      id: 'batch-1',
      name: 'Lote 001',
      quantity: 3,
      createdBy: 'operator-1',
    })
  }

  it('gera N tags com Public ID + código criptografado', async () => {
    const batch = pendingBatch()
    batches.findById.mockResolvedValue(batch)
    ;(randomUUID as jest.Mock).mockReturnValue('tag-uuid')
    idGen.generatePublicId
      .mockReturnValueOnce('AAAAAAA2')
      .mockReturnValueOnce('BBBBBBB3')
      .mockReturnValueOnce('CCCCCCC4')
    codeGen.generate
      .mockResolvedValueOnce('X8P4-L2Q9')
      .mockResolvedValueOnce('Y9Q5-M3R8')
      .mockResolvedValueOnce('Z2T6-N4S7')
    cipher.encrypt
      .mockReturnValueOnce('enc-1')
      .mockReturnValueOnce('enc-2')
      .mockReturnValueOnce('enc-3')

    const result = await useCase.execute('operator-1', 'batch-1')

    expect(result.tags).toHaveLength(3)
    expect(result.codes).toEqual(['X8P4-L2Q9', 'Y9Q5-M3R8', 'Z2T6-N4S7'])
    // criptografa cada código antes de persistir (nunca o texto puro)
    expect(cipher.encrypt).toHaveBeenNthCalledWith(1, 'X8P4-L2Q9')
    expect(cipher.encrypt).toHaveBeenNthCalledWith(2, 'Y9Q5-M3R8')
    expect(cipher.encrypt).toHaveBeenNthCalledWith(3, 'Z2T6-N4S7')
    const savedTags = tags.saveMany.mock.calls[0][0]
    expect(savedTags[0].activationCodeEncrypted).toBe('enc-1')
    expect(savedTags[0].publicId.value).toBe('AAAAAAA2')
  })

  it('atualiza o lote para GENERATED com contador', async () => {
    const batch = pendingBatch()
    batches.findById.mockResolvedValue(batch)
    idGen.generatePublicId.mockReturnValue('AAAAAAA2')
    codeGen.generate.mockResolvedValue('X8P4-L2Q9')
    cipher.encrypt.mockReturnValue('enc-1')

    await useCase.execute('operator-1', 'batch-1')

    const savedBatch = batches.save.mock.calls[0][0]
    expect(savedBatch.status).toBe('GENERATED')
    expect(savedBatch.generatedCount).toBe(3)
  })

  it('lança BatchNotFoundError se lote não existe', async () => {
    batches.findById.mockResolvedValue(null)

    await expect(useCase.execute('operator-1', 'x')).rejects.toThrow(
      BatchNotFoundError,
    )
  })

  it('audita a geração', async () => {
    const batch = pendingBatch()
    batches.findById.mockResolvedValue(batch)
    idGen.generatePublicId.mockReturnValue('AAAAAAA2')
    codeGen.generate.mockResolvedValue('X8P4-L2Q9')
    cipher.encrypt.mockReturnValue('enc-1')

    await useCase.execute('operator-1', 'batch-1')

    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'tags_generate' }),
    )
  })
})
