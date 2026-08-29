import { Inject, Injectable } from '@nestjs/common'
import { NFC_TAG_REPOSITORY_PORT } from '../../../nfc/domain/repositories/nfc-tag.repository.port'
import type { NfcTagRepositoryPort } from '../../../nfc/domain/repositories/nfc-tag.repository.port'
import { PET_REPOSITORY_PORT } from '../../../pets/domain/repositories/pet.repository.port'
import type { PetRepositoryPort } from '../../../pets/domain/repositories/pet.repository.port'
import { USER_REPOSITORY_PORT } from '../../../users/domain/repositories/user.repository.port'
import type { UserRepositoryPort } from '../../../users/domain/repositories/user.repository.port'
import { CACHE_PORT } from '../../../../common/ports/cache.port'
import type { CachePort } from '../../../../common/ports/cache.port'
import { AccessSource } from '../../../../common/constants/access-source'
import { RegisterAccessEventUseCase } from '../../../access-events/application/use-cases/register-access-event.use-case'
import {
  profileCacheKey,
  PROFILE_CACHE_TTL_SECONDS,
  PROFILE_CACHE_TTL_LOST_SECONDS,
} from '../../../../common/constants/profile-cache'
import { TagNotFoundError } from '../../../nfc/application/errors'
import { PetNotFoundError } from '../../../pets/application/errors'
import { UserNotFoundError } from '../../../users/application/errors'
import { PublicProfile } from '../../domain/value-objects/public-profile.vo'
import type { PublicProfileJson } from '../../domain/value-objects/public-profile.vo'
import type { NfcTag } from '../../../nfc/domain/entities/nfc-tag.entity'

export interface GetPublicProfileInput {
  publicId: string
  source?: AccessSource
  ipHash?: string | null
  deviceType?: string | null
}

/**
 * Caso de uso: montar o perfil público de um pet a partir do `publicId`
 * do pingente (doc-sistema §perfil-privacidade / plano-perfil-publico).
 *
 * Rota pública — não autenticada. Retorna:
 *  - `PublicProfile.active`   → pet + tutor (privacidade aplicada).
 *  - `PublicProfile.unactivated` → pingente virgem ou pet soft-deletado.
 *
 * Cache (Redis via `CachePort`): chave `profile:{publicId}`. Hit devolve direto;
 * miss monta e popula. TTL 300s (60s se pet perdido).
 *
 * Side-effect (RF18): registra o `AccessEvent` a cada acesso. A tag é resolvida
 * sempre (antes do cache) para permitir o registro mesmo em cache hit. A falha
 * do registro é engolida (RNF10) — nunca derruba o perfil.
 *
 * NUNCA expõe dados administrativos (senha, email administrativo, código de
 * ativação, uid, tokens). Public ID não é credencial (Fase 3).
 */
@Injectable()
export class GetPublicProfileUseCase {
  constructor(
    @Inject(NFC_TAG_REPOSITORY_PORT)
    private readonly tags: NfcTagRepositoryPort,
    @Inject(PET_REPOSITORY_PORT)
    private readonly pets: PetRepositoryPort,
    @Inject(USER_REPOSITORY_PORT)
    private readonly users: UserRepositoryPort,
    @Inject(CACHE_PORT) private readonly cache: CachePort,
    private readonly registerAccessEvent: RegisterAccessEventUseCase,
  ) {}

  async execute(input: GetPublicProfileInput): Promise<PublicProfile> {
    const publicId = input.publicId
    const key = profileCacheKey(publicId.toUpperCase())

    // Resolve a tag sempre — necessário para o side-effect de acesso (RF18),
    // mesmo em cache hit.
    const tag = await this.tags.findByPublicId(publicId)
    if (!tag) {
      throw new TagNotFoundError(publicId)
    }

    await this.trackAccess(tag, input)

    const cached = await this.cache.get(key)
    if (cached) {
      return PublicProfile.fromJSON(JSON.parse(cached) as PublicProfileJson)
    }

    const profile = await this.build(tag)
    await this.cache.set(
      key,
      JSON.stringify(profile.toJSON()),
      this.ttlFor(profile),
    )
    return profile
  }

  private async trackAccess(
    tag: NfcTag,
    input: GetPublicProfileInput,
  ): Promise<void> {
    try {
      await this.registerAccessEvent.execute({
        petId: tag.petId,
        nfcTagId: tag.id,
        source: input.source ?? AccessSource.DIRECT,
        ipHash: input.ipHash ?? null,
        deviceType: input.deviceType ?? null,
      })
    } catch {
      // RNF10: falha no registro de acesso nunca derruba o perfil.
    }
  }

  private async build(tag: NfcTag): Promise<PublicProfile> {
    // Pingente sem pet ativo é "não ativado".
    if (!tag.petId) {
      return PublicProfile.unactivated(tag.status)
    }

    const pet = await this.pets.findById(tag.petId)
    if (!pet) {
      throw new PetNotFoundError(tag.petId)
    }

    // Pet soft-deletado é tratado como "não ativado" (não vaza dados do tutor).
    if (pet.deletedAt !== null) {
      return PublicProfile.unactivated(tag.status)
    }

    const owner = await this.users.findById(pet.ownerId)
    if (!owner) {
      throw new UserNotFoundError(pet.ownerId)
    }

    return PublicProfile.active(pet, owner)
  }

  private ttlFor(profile: PublicProfile): number {
    return profile.pet?.lostStatus
      ? PROFILE_CACHE_TTL_LOST_SECONDS
      : PROFILE_CACHE_TTL_SECONDS
  }
}
