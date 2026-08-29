import { VerifyNfcUseCase } from '../verify-nfc.use-case'
import { GenerateQrUseCase } from '../generate-qr.use-case'
import { ListTagsUseCase } from '../list-tags.use-case'
import { TagNotFoundError } from '../../errors'
import type { NfcTagRepositoryPort } from '../../../domain/repositories/nfc-tag.repository.port'
import type { NfcReaderPort } from '../../../domain/services/nfc-reader.port'
import type { QrGeneratorPort } from '../../../domain/services/qr-generator.port'
import type { PublicBaseUrlPort } from '../../../domain/services/public-base-url.port'
import type { AuditLoggerPort } from '../../../../../common/ports/audit-logger.port'
import { NfcTag } from '../../../domain/entities/nfc-tag.entity'
import { PublicId } from '../../../domain/value-objects/public-id.vo'
import { Uid } from '../../../domain/value-objects/uid.vo'

describe('NFC — verify/qr/list', () => {
  let tags: jest.Mocked<NfcTagRepositoryPort>
  let reader: jest.Mocked<NfcReaderPort>
  let qrGen: jest.Mocked<QrGeneratorPort>
  let baseUrl: jest.Mocked<PublicBaseUrlPort>
  let audit: jest.Mocked<AuditLoggerPort>

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
    reader = { read: jest.fn() }
    qrGen = { generatePng: jest.fn() }
    baseUrl = {
      buildProfileUrl: jest.fn(publicId => `https://dominio.com/p/${publicId}`),
    }
    audit = { log: jest.fn() }
  })

  function readyTag(): NfcTag {
    const t = NfcTag.create({
      id: 'tag-1',
      publicId: PublicId.create('7F4K9M2Q'),
      activationCodeEncrypted: 'encrypted',
      batchId: 'batch-1',
    })
    t.markWritten(Uid.create('04:A7:32:91:8B:1F'))
    return t
  }

  describe('VerifyNfcUseCase', () => {
    it('verifica OK quando a URL lida coincide', async () => {
      tags.findByPublicId.mockResolvedValue(readyTag())
      reader.read.mockResolvedValue('https://dominio.com/p/7F4K9M2Q')

      const useCase = new VerifyNfcUseCase(tags, reader, baseUrl, audit)
      const result = await useCase.execute('7F4K9M2Q')

      expect(result.ok).toBe(true)
    })

    it('verifica FAIL quando a URL não coincide', async () => {
      tags.findByPublicId.mockResolvedValue(readyTag())
      reader.read.mockResolvedValue('https://dominio.com/p/ERRADA')

      const useCase = new VerifyNfcUseCase(tags, reader, baseUrl, audit)
      const result = await useCase.execute('7F4K9M2Q')

      expect(result.ok).toBe(false)
    })

    it('lança TagNotFoundError se não existe', async () => {
      tags.findByPublicId.mockResolvedValue(null)
      const useCase = new VerifyNfcUseCase(tags, reader, baseUrl, audit)

      await expect(useCase.execute('x')).rejects.toThrow(TagNotFoundError)
    })
  })

  describe('GenerateQrUseCase', () => {
    it('gera PNG a partir da URL da tag', async () => {
      tags.findByPublicId.mockResolvedValue(readyTag())
      qrGen.generatePng.mockResolvedValue(Buffer.from('png'))

      const useCase = new GenerateQrUseCase(tags, qrGen, baseUrl, audit)
      const result = await useCase.execute('7F4K9M2Q')

      expect(qrGen.generatePng).toHaveBeenCalledWith(
        'https://dominio.com/p/7F4K9M2Q',
      )
      expect(result.publicId).toBe('7F4K9M2Q')
      expect(result.png).toBeInstanceOf(Buffer)
    })

    it('lança TagNotFoundError se não existe', async () => {
      tags.findByPublicId.mockResolvedValue(null)
      const useCase = new GenerateQrUseCase(tags, qrGen, baseUrl, audit)

      await expect(useCase.execute('x')).rejects.toThrow(TagNotFoundError)
    })
  })

  describe('ListTagsUseCase', () => {
    it('lista tags por batch', async () => {
      tags.listByBatch.mockResolvedValue([readyTag()])
      const useCase = new ListTagsUseCase(tags)

      const result = await useCase.execute({ batchId: 'batch-1' })
      expect(result).toHaveLength(1)
    })

    it('lista tags com filtros de status e paginação', async () => {
      tags.list.mockResolvedValue([readyTag()])
      const useCase = new ListTagsUseCase(tags)

      const result = await useCase.execute({
        status: 'READY',
        page: 1,
        limit: 20,
      })
      expect(tags.list).toHaveBeenCalledWith({
        status: 'READY',
        page: 1,
        limit: 20,
      })
      expect(result).toHaveLength(1)
    })
  })
})
