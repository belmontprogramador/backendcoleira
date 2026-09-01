import { GenerateBatchSheetUseCase } from '../generate-batch-sheet.use-case'
import { BatchEmptyError, BatchNotFoundError } from '../../errors'
import type { BatchRepositoryPort } from '../../../domain/repositories/batch.repository.port'
import type { NfcTagRepositoryPort } from '../../../domain/repositories/nfc-tag.repository.port'
import type { ActivationCodeCipherPort } from '../../../domain/services/activation-code-cipher.port'
import type { QrGeneratorPort } from '../../../domain/services/qr-generator.port'
import type { PublicBaseUrlPort } from '../../../domain/services/public-base-url.port'
import type { CardSheetPdfPort } from '../../../domain/services/card-sheet-pdf.port'
import type { AuditLoggerPort } from '../../../../../common/ports/audit-logger.port'
import { Batch } from '../../../domain/entities/batch.entity'
import { NfcTag } from '../../../domain/entities/nfc-tag.entity'
import { PublicId } from '../../../domain/value-objects/public-id.vo'

describe('GenerateBatchSheetUseCase', () => {
  let batches: jest.Mocked<BatchRepositoryPort>
  let tags: jest.Mocked<NfcTagRepositoryPort>
  let cipher: jest.Mocked<ActivationCodeCipherPort>
  let qrGen: jest.Mocked<QrGeneratorPort>
  let baseUrl: jest.Mocked<PublicBaseUrlPort>
  let sheet: jest.Mocked<CardSheetPdfPort>
  let audit: jest.Mocked<AuditLoggerPort>
  let useCase: GenerateBatchSheetUseCase

  beforeEach(() => {
    batches = {
      findById: jest.fn(),
      findByName: jest.fn(),
      list: jest.fn(),
      count: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    }
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
      deleteByBatch: jest.fn(),
    }
    cipher = { encrypt: jest.fn(), decrypt: jest.fn() }
    qrGen = { generatePng: jest.fn() }
    baseUrl = { buildProfileUrl: jest.fn() }
    sheet = { generate: jest.fn() }
    audit = { log: jest.fn() }
    useCase = new GenerateBatchSheetUseCase(
      batches,
      tags,
      cipher,
      qrGen,
      baseUrl,
      sheet,
      audit,
    )
  })

  function batch(): Batch {
    return Batch.create({
      id: 'batch-1',
      name: 'Lote 001',
      quantity: 2,
      createdBy: 'operator-1',
    })
  }

  function tag(publicId: string): NfcTag {
    return NfcTag.create({
      id: `tag-${publicId}`,
      publicId: PublicId.create(publicId),
      activationCodeEncrypted: `enc-${publicId}`,
      batchId: 'batch-1',
    })
  }

  it('gera PDF com códigos descriptografados + QR por tag', async () => {
    const t1 = tag('AAAAAAA2')
    const t2 = tag('BBBBBBB3')
    batches.findById.mockResolvedValue(batch())
    tags.listByBatch.mockResolvedValue([t1, t2])
    cipher.decrypt.mockImplementation((c: string) =>
      c === t1.activationCodeEncrypted ? 'X8P4-L2Q9' : 'Y9Q5-M3R8',
    )
    baseUrl.buildProfileUrl.mockImplementation(
      (p: string) => `https://dominio.com/p/${p}`,
    )
    qrGen.generatePng.mockResolvedValue(Buffer.from('png'))
    sheet.generate.mockResolvedValue(Buffer.from('%PDF-fake'))

    const result = await useCase.execute('operator-1', 'batch-1')

    expect(cipher.decrypt).toHaveBeenNthCalledWith(
      1,
      t1.activationCodeEncrypted,
    )
    expect(cipher.decrypt).toHaveBeenNthCalledWith(
      2,
      t2.activationCodeEncrypted,
    )
    expect(qrGen.generatePng).toHaveBeenCalledTimes(2)
    expect(sheet.generate).toHaveBeenCalledWith([
      expect.objectContaining({
        publicId: t1.publicId.value,
        code: 'X8P4-L2Q9',
      }),
      expect.objectContaining({
        publicId: t2.publicId.value,
        code: 'Y9Q5-M3R8',
      }),
    ])
    expect(result.pdf).toEqual(Buffer.from('%PDF-fake'))
    expect(result.count).toBe(2)
  })

  it('sanitiza o nome do arquivo', async () => {
    const b = Batch.create({
      id: 'batch-1',
      name: 'Lote 001/2026',
      quantity: 1,
      createdBy: 'o',
    })
    batches.findById.mockResolvedValue(b)
    tags.listByBatch.mockResolvedValue([tag('AAAAAAA2')])
    cipher.decrypt.mockReturnValue('X8P4-L2Q9')
    baseUrl.buildProfileUrl.mockReturnValue('https://dominio.com/p/AAAAAAA2')
    qrGen.generatePng.mockResolvedValue(Buffer.from('png'))
    sheet.generate.mockResolvedValue(Buffer.from('%PDF'))

    const result = await useCase.execute('operator-1', 'batch-1')

    expect(result.filename).toBe('lote-lote-001-2026.pdf')
  })

  it('lança BatchNotFoundError se lote não existe', async () => {
    batches.findById.mockResolvedValue(null)

    await expect(useCase.execute('operator-1', 'x')).rejects.toThrow(
      BatchNotFoundError,
    )
  })

  it('lança BatchEmptyError se lote não tem tags', async () => {
    batches.findById.mockResolvedValue(batch())
    tags.listByBatch.mockResolvedValue([])

    await expect(useCase.execute('operator-1', 'batch-1')).rejects.toThrow(
      BatchEmptyError,
    )
  })

  it('audita a geração da folha', async () => {
    batches.findById.mockResolvedValue(batch())
    tags.listByBatch.mockResolvedValue([tag('AAAAAAA2')])
    cipher.decrypt.mockReturnValue('X8P4-L2Q9')
    baseUrl.buildProfileUrl.mockReturnValue('https://dominio.com/p/AAAAAAA2')
    qrGen.generatePng.mockResolvedValue(Buffer.from('png'))
    sheet.generate.mockResolvedValue(Buffer.from('%PDF'))

    await useCase.execute('operator-1', 'batch-1')

    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'batch_sheet_generate' }),
    )
  })
})
