import { GetNextTagToWriteUseCase } from '../get-next-tag-to-write.use-case'
import { NfcTag } from '../../../domain/entities/nfc-tag.entity'
import type { NfcTagRepositoryPort } from '../../../domain/repositories/nfc-tag.repository.port'
import type { PublicBaseUrlPort } from '../../../domain/services/public-base-url.port'
import { PublicId } from '../../../domain/value-objects/public-id.vo'

describe('GetNextTagToWriteUseCase', () => {
  let tags: jest.Mocked<NfcTagRepositoryPort>
  let baseUrl: jest.Mocked<PublicBaseUrlPort>
  let useCase: GetNextTagToWriteUseCase

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
    baseUrl = {
      buildProfileUrl: jest.fn(publicId => `https://dominio.com/p/${publicId}`),
    }
    useCase = new GetNextTagToWriteUseCase(tags, baseUrl)
  })

  function createdTag(): NfcTag {
    return NfcTag.create({
      id: 'tag-1',
      publicId: PublicId.create('7F4K9M2Q'),
      activationCodeEncrypted: 'encrypted-code',
      batchId: 'batch-1',
    })
  }

  it('devolve a próxima tag CREATED com a URL', async () => {
    tags.findNextToWrite.mockResolvedValue(createdTag())

    const result = await useCase.execute('batch-1')

    expect(tags.findNextToWrite).toHaveBeenCalledWith('batch-1')
    expect(result).toEqual({
      publicId: '7F4K9M2Q',
      url: 'https://dominio.com/p/7F4K9M2Q',
      resetAt: null,
    })
  })

  it('devolve null quando não há tag CREATED', async () => {
    tags.findNextToWrite.mockResolvedValue(null)

    const result = await useCase.execute(undefined)

    expect(result).toBeNull()
  })

  it('repassa batchId opcional (undefined quando omitido)', async () => {
    tags.findNextToWrite.mockResolvedValue(createdTag())

    await useCase.execute()

    expect(tags.findNextToWrite).toHaveBeenCalledWith(undefined)
  })
})
