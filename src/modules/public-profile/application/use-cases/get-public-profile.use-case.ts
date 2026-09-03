import { Inject, Injectable } from '@nestjs/common'
import { NFC_TAG_REPOSITORY_PORT } from '../../../nfc/domain/repositories/nfc-tag.repository.port'
import type { NfcTagRepositoryPort } from '../../../nfc/domain/repositories/nfc-tag.repository.port'
import { PET_REPOSITORY_PORT } from '../../../pets/domain/repositories/pet.repository.port'
import type { PetRepositoryPort } from '../../../pets/domain/repositories/pet.repository.port'
import { USER_REPOSITORY_PORT } from '../../../users/domain/repositories/user.repository.port'
import type { UserRepositoryPort } from '../../../users/domain/repositories/user.repository.port'
import { CACHE_PORT } from '../../../../common/ports/cache.port'
import type { CachePort } from '../../../../common/ports/cache.port'
import { FEATURE_ACCESS_PORT } from '../../../../common/ports/feature-access.port'
import type { FeatureAccessPort } from '../../../../common/ports/feature-access.port'
import { IP_GEOLOCATION_PORT } from '../../../../common/ports/ip-geolocation.port'
import type { IpGeolocationPort } from '../../../../common/ports/ip-geolocation.port'
import {
  CONTACT_MESSAGES_FEATURE,
  PET_MEDICAL_FEATURE,
  MULTIPLE_CONTACTS_FEATURE,
} from '../../../../common/constants/features'
import { PET_MEDICAL_REPOSITORY_PORT } from '../../../pet-medical/domain/repositories/pet-medical.repository.port'
import type { PetMedicalRepositoryPort } from '../../../pet-medical/domain/repositories/pet-medical.repository.port'
import type { PetMedical } from '../../../pet-medical/domain/entities/pet-medical.entity'
import { PET_CONTACT_REPOSITORY_PORT } from '../../../pet-contacts/domain/repositories/pet-contact.repository.port'
import type { PetContactRepositoryPort } from '../../../pet-contacts/domain/repositories/pet-contact.repository.port'
import type { PetContact } from '../../../pet-contacts/domain/entities/pet-contact.entity'
import type { PetPrivacy } from '../../../pets/domain/value-objects/pet-privacy.vo'
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
  ip?: string | null
  ipHash?: string | null
  deviceType?: string | null
}

/** Dados médicos expostos publicamente (privacidade já aplicada). */
export interface PublicMedicalInfo {
  allergies: string | null
  medications: string | null
  specialCare: string | null
  medicalConditions: string | null
  veterinarianName: string | null
  veterinarianPhone: string | null
}

/** Contato de emergência exposto publicamente. */
export interface PublicContactInfo {
  name: string
  phone: string | null
  email: string | null
  relationship: string | null
}

export interface PublicProfileResult {
  profile: PublicProfile
  /** Dono é Premium com a feature `CONTACT_MESSAGES`? (gate do formulário). */
  contactEnabled: boolean
  /** Dados médicos (null = não exposto: sem feature, sem privacidade ou sem dados). */
  medical: PublicMedicalInfo | null
  /** Contatos de emergência ([] = não exposto: sem feature, sem privacidade ou sem dados). */
  contacts: PublicContactInfo[]
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
 * `contactEnabled` é calculado AO VIVO (não cacheado) — resolve a feature
 * `CONTACT_MESSAGES` do dono a cada request. Assim o gate de mensagem nunca
 * fica defasado quando o plano do dono muda (upgrade/downgrade).
 *
 * Side-effect (RF18): registra o `AccessEvent` a cada acesso, agora com a
 * localização aproximada do visitante (IP→geo, best-effort). A falha do
 * registro é engolida (RNF10) — nunca derruba o perfil.
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
    @Inject(PET_MEDICAL_REPOSITORY_PORT)
    private readonly medical: PetMedicalRepositoryPort,
    @Inject(PET_CONTACT_REPOSITORY_PORT)
    private readonly contacts: PetContactRepositoryPort,
    @Inject(CACHE_PORT) private readonly cache: CachePort,
    @Inject(FEATURE_ACCESS_PORT)
    private readonly featureAccess: FeatureAccessPort,
    @Inject(IP_GEOLOCATION_PORT)
    private readonly geolocation: IpGeolocationPort,
    private readonly registerAccessEvent: RegisterAccessEventUseCase,
  ) {}

  async execute(input: GetPublicProfileInput): Promise<PublicProfileResult> {
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
    const profile = cached
      ? PublicProfile.fromJSON(JSON.parse(cached) as PublicProfileJson)
      : await this.buildAndCache(tag, key)

    // Gate de mensagem: calculado ao vivo (não cacheado) — reflete o plano
    // atual do dono sem precisar invalidar o cache em mudança de assinatura.
    const contactEnabled =
      profile.isActive && tag.ownerId
        ? await this.featureAccess.hasFeature(
            tag.ownerId,
            CONTACT_MESSAGES_FEATURE,
          )
        : false

    // Extras premium (dados médicos + contatos) resolvidos AO VIVO — não
    // cacheados, para refletir mudanças de plano/privacidade imediatamente.
    const { medical, contacts } = await this.resolvePremiumExtras(tag, profile)

    return { profile, contactEnabled, medical, contacts }
  }

  private async trackAccess(
    tag: NfcTag,
    input: GetPublicProfileInput,
  ): Promise<void> {
    try {
      const locationApprox = await this.geolocation.resolve(input.ip ?? null)
      await this.registerAccessEvent.execute({
        petId: tag.petId,
        nfcTagId: tag.id,
        source: input.source ?? AccessSource.DIRECT,
        ipHash: input.ipHash ?? null,
        deviceType: input.deviceType ?? null,
        locationApprox,
      })
    } catch {
      // RNF10: falha no registro de acesso nunca derruba o perfil.
    }
  }

  /**
   * Resolve os dados premium expostos no perfil público:
   *  - `medical`: feature `PET_MEDICAL` + privacidade `showMedical`/`showVeterinarian`.
   *  - `contacts`: feature `MULTIPLE_CONTACTS` + privacidade `showContacts`.
   *
   * Calculado ao vivo (não cacheado) para que upgrade/downgrade de plano e
   * mudanças de privacidade reflitam imediatamente. Só roda para perfil ativo.
   */
  private async resolvePremiumExtras(
    tag: NfcTag,
    profile: PublicProfile,
  ): Promise<{ medical: PublicMedicalInfo | null; contacts: PublicContactInfo[] }> {
    if (!profile.isActive || !tag.petId || !tag.ownerId) {
      return { medical: null, contacts: [] }
    }

    const pet = await this.pets.findById(tag.petId)
    if (!pet || pet.deletedAt !== null) {
      return { medical: null, contacts: [] }
    }

    const [hasMedical, hasContacts] = await Promise.all([
      this.featureAccess.hasFeature(tag.ownerId, PET_MEDICAL_FEATURE),
      this.featureAccess.hasFeature(tag.ownerId, MULTIPLE_CONTACTS_FEATURE),
    ])

    let medical: PublicMedicalInfo | null = null
    if (hasMedical && (pet.privacy.showMedical || pet.privacy.showVeterinarian)) {
      const raw = await this.medical.findByPetId(pet.id)
      const info = raw ? this.toPublicMedical(raw, pet.privacy) : null
      medical = info && hasAnyValue(info) ? info : null
    }

    let contacts: PublicContactInfo[] = []
    if (hasContacts && pet.privacy.showContacts) {
      const list = await this.contacts.listByPet(pet.id)
      contacts = list.map((c) => this.toPublicContact(c))
    }

    return { medical, contacts }
  }

  private toPublicMedical(
    raw: PetMedical,
    privacy: PetPrivacy,
  ): PublicMedicalInfo {
    return {
      allergies: privacy.showMedical ? raw.allergies : null,
      medications: privacy.showMedical ? raw.medications : null,
      specialCare: privacy.showMedical ? raw.specialCare : null,
      medicalConditions: privacy.showMedical ? raw.medicalConditions : null,
      veterinarianName: privacy.showVeterinarian ? raw.veterinarianName : null,
      veterinarianPhone: privacy.showVeterinarian ? raw.veterinarianPhone : null,
    }
  }

  private toPublicContact(c: PetContact): PublicContactInfo {
    return {
      name: c.name,
      phone: c.phone,
      email: c.email,
      relationship: c.relationship,
    }
  }

  private async buildAndCache(
    tag: NfcTag,
    key: string,
  ): Promise<PublicProfile> {
    const profile = await this.build(tag)
    await this.cache.set(
      key,
      JSON.stringify(profile.toJSON()),
      this.ttlFor(profile),
    )
    return profile
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

/** true se ao menos um campo do resumo médico tem valor (senão não expõe). */
function hasAnyValue(info: PublicMedicalInfo): boolean {
  return (
    info.allergies !== null ||
    info.medications !== null ||
    info.specialCare !== null ||
    info.medicalConditions !== null ||
    info.veterinarianName !== null ||
    info.veterinarianPhone !== null
  )
}
