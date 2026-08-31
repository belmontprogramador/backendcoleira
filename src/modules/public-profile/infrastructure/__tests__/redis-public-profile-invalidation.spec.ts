import { RedisPublicProfileInvalidation } from '../redis-public-profile-invalidation'
import type { CachePort } from '../../../../common/ports/cache.port'
import type { NfcTagRepositoryPort } from '../../../nfc/domain/repositories/nfc-tag.repository.port'
import { NfcTag, TagStatus } from '../../../nfc/domain/entities/nfc-tag.entity'
import { PublicId } from '../../../nfc/domain/value-objects/public-id.vo'
import { profileCacheKey } from '../../../../common/constants/profile-cache'

describe('RedisPublicProfileInvalidation', () => {
  let cache: jest.Mocked<CachePort>
  let tags: jest.Mocked<NfcTagRepositoryPort>
  let invalidation: RedisPublicProfileInvalidation

  beforeEach(() => {
    cache = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      ping: jest.fn(),
      quit: jest.fn(),
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
    }
    invalidation = new RedisPublicProfileInvalidation(cache, tags)
  })

  function makeTag(publicId: string): NfcTag {
    return NfcTag.reconstitute({
      id: `tag-${publicId}`,
      publicId: PublicId.create(publicId),
      uid: null,
      activationCodeEncrypted: 'encrypted',
      status: TagStatus.ACTIVE,
      batchId: null,
      ownerId: 'user-1',
      petId: 'pet-1',
      activatedAt: null,
      deactivatedAt: null,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    })
  }

  it('invalida por publicId', async () => {
    await invalidation.invalidateByPublicId('7F4K9M2Q')

    expect(cache.del).toHaveBeenCalledWith(profileCacheKey('7F4K9M2Q'))
  })

  it('invalida todas as tags do pet', async () => {
    tags.listByPet.mockResolvedValue([makeTag('7F4K9M2Q'), makeTag('8G5L2N3R')])

    await invalidation.invalidateByPetId('pet-1')

    expect(tags.listByPet).toHaveBeenCalledWith('pet-1')
    expect(cache.del).toHaveBeenCalledWith(profileCacheKey('7F4K9M2Q'))
    expect(cache.del).toHaveBeenCalledWith(profileCacheKey('8G5L2N3R'))
    expect(cache.del).toHaveBeenCalledTimes(2)
  })

  it('não chama del quando o pet não tem tags', async () => {
    tags.listByPet.mockResolvedValue([])

    await invalidation.invalidateByPetId('pet-1')

    expect(cache.del).not.toHaveBeenCalled()
  })
})
