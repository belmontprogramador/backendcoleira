import { ReprintCodeUseCase } from '../reprint-code.use-case'
import { TagNotFoundError } from '../../errors'
import { NfcTag } from '../../../domain/entities/nfc-tag.entity'
import type { NfcTagRepositoryPort } from '../../../domain/repositories/nfc-tag.repository.port'
import type { ActivationCodeCipherPort } from '../../../domain/services/activation-code-cipher.port'
import type { AuditLoggerPort } from '../../../../../common/ports/audit-logger.port'
import { PublicId } from '../../../domain/value-objects/public-id.vo'

describe('ReprintCodeUseCase', () => {
  let tags: jest.Mocked<NfcTagRepositoryPort>
  let cipher: jest.Mocked<ActivationCodeCipherPort>
  let audit: jest.Mocked<AuditLoggerPort>
  let useCase: ReprintCodeUseCase

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
    cipher = { encrypt: jest.fn(), decrypt: jest.fn() }
    audit = { log: jest.fn() }
    useCase = new ReprintCodeUseCase(tags, cipher, audit)
  })

  function tag(): NfcTag {
    return NfcTag.create({
      id: 'tag-1',
      publicId: PublicId.create('7F4K9M2Q'),
      activationCodeEncrypted: 'encrypted-code',
      batchId: 'batch-1',
    })
  }

  it('descriptografa e devolve o código em texto puro', async () => {
    tags.findByPublicId.mockResolvedValue(tag())
    cipher.decrypt.mockReturnValue('X8P4-L2Q9')

    const result = await useCase.execute('operator-1', '7F4K9M2Q')

    expect(cipher.decrypt).toHaveBeenCalledWith('encrypted-code')
    expect(result).toEqual({ publicId: '7F4K9M2Q', code: 'X8P4-L2Q9' })
  })

  it('lança TagNotFoundError se a tag não existe', async () => {
    tags.findByPublicId.mockResolvedValue(null)

    await expect(useCase.execute('operator-1', 'NAOEXISTE')).rejects.toThrow(
      TagNotFoundError,
    )
  })

  it('audita a reimpressão', async () => {
    tags.findByPublicId.mockResolvedValue(tag())
    cipher.decrypt.mockReturnValue('X8P4-L2Q9')

    await useCase.execute('operator-1', '7F4K9M2Q')

    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'tag_reprint' }),
    )
  })
})
