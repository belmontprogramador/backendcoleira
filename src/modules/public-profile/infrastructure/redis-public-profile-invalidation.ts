import { Inject, Injectable } from '@nestjs/common'
import { CACHE_PORT } from '../../../common/ports/cache.port'
import type { CachePort } from '../../../common/ports/cache.port'
import { NFC_TAG_REPOSITORY_PORT } from '../../nfc/domain/repositories/nfc-tag.repository.port'
import type { NfcTagRepositoryPort } from '../../nfc/domain/repositories/nfc-tag.repository.port'
import type { PublicProfileInvalidationPort } from '../../../common/ports/public-profile-invalidation.port'
import { profileCacheKey } from '../../../common/constants/profile-cache'

/**
 * Implementação concreta da invalidação do cache do perfil público.
 *
 * DIP: a aplicação depende de `PublicProfileInvalidationPort`; esta classe é a
 * implementação plugável que combina `CachePort` (global) + `NfcTagRepositoryPort`.
 */
@Injectable()
export class RedisPublicProfileInvalidation implements PublicProfileInvalidationPort {
  constructor(
    @Inject(CACHE_PORT) private readonly cache: CachePort,
    @Inject(NFC_TAG_REPOSITORY_PORT)
    private readonly tags: NfcTagRepositoryPort,
  ) {}

  async invalidateByPublicId(publicId: string): Promise<void> {
    await this.cache.del(profileCacheKey(publicId))
  }

  async invalidateByPetId(petId: string): Promise<void> {
    const tags = await this.tags.listByPet(petId)
    await Promise.all(
      tags.map(tag => this.cache.del(profileCacheKey(tag.publicId.value))),
    )
  }
}
