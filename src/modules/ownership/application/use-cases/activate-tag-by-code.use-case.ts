import { Inject, Injectable } from '@nestjs/common'
import { NFC_TAG_REPOSITORY_PORT } from '../../../nfc/domain/repositories/nfc-tag.repository.port'
import type { NfcTagRepositoryPort } from '../../../nfc/domain/repositories/nfc-tag.repository.port'
import { ACTIVATION_CODE_CIPHER_PORT } from '../../../nfc/domain/services/activation-code-cipher.port'
import type { ActivationCodeCipherPort } from '../../../nfc/domain/services/activation-code-cipher.port'
import { PET_REPOSITORY_PORT } from '../../../pets/domain/repositories/pet.repository.port'
import type { PetRepositoryPort } from '../../../pets/domain/repositories/pet.repository.port'
import { AUDIT_LOGGER_PORT } from '../../../../common/ports/audit-logger.port'
import type { AuditLoggerPort } from '../../../../common/ports/audit-logger.port'
import { PUBLIC_PROFILE_INVALIDATION_PORT } from '../../../../common/ports/public-profile-invalidation.port'
import type { PublicProfileInvalidationPort } from '../../../../common/ports/public-profile-invalidation.port'
import type { NfcTag } from '../../../nfc/domain/entities/nfc-tag.entity'
import { ActivationCodeMismatchError, PetNotFoundError } from '../errors'
import { PetOwnership } from '../../../pets/application/policies/pet-ownership.policy'

/**
 * Caso de uso: ativar um pingente pelo código de ativação + associar a um pet
 * existente (fluxo "vincular pingente a partir de um pet, sem escanear o QR").
 *
 * Diferente de `ActivateTagUseCase` (que exige o `publicId` do QR/NFC), aqui o
 * cliente só tem o CÓDIGO impresso no cartão. Como o código fica criptografado
 * (AES-256-GCM, IV aleatório), não há índice buscável — percorremos os tags
 * não-ativados (AVAILABLE/DELIVERED) e descriptografamos cada código até achar.
 * Trade-off aceito no MVP (poucos cards): O(n), mitigado pelo rate-limit global.
 *
 * Segurança: o código errado devolve o MESMO erro genérico (não vaza quais
 * códigos existem) e a falha NÃO loga o código tentado.
 */
@Injectable()
export class ActivateTagByCodeUseCase {
  constructor(
    @Inject(NFC_TAG_REPOSITORY_PORT)
    private readonly tags: NfcTagRepositoryPort,
    @Inject(ACTIVATION_CODE_CIPHER_PORT)
    private readonly cipher: ActivationCodeCipherPort,
    @Inject(PET_REPOSITORY_PORT) private readonly pets: PetRepositoryPort,
    @Inject(AUDIT_LOGGER_PORT) private readonly audit: AuditLoggerPort,
    @Inject(PUBLIC_PROFILE_INVALIDATION_PORT)
    private readonly invalidation: PublicProfileInvalidationPort,
  ) {}

  async execute(
    userId: string,
    activationCode: string,
    petId: string,
  ): Promise<NfcTag> {
    const normalized = activationCode.toUpperCase()

    const candidates = await this.tags.listUnactivated()
    let tag: NfcTag | null = null
    for (const candidate of candidates) {
      const decrypted = this.cipher.decrypt(candidate.activationCodeEncrypted)
      if (decrypted.toUpperCase() === normalized) {
        tag = candidate
        break
      }
    }

    if (!tag) {
      await this.audit.log({
        userId,
        action: 'tag_activate_by_code_failed',
        entity: 'nfc_tag',
      })
      throw new ActivationCodeMismatchError()
    }

    const pet = await this.pets.findById(petId)
    if (!pet) {
      throw new PetNotFoundError(petId)
    }
    PetOwnership.assertOwner(pet, userId)

    tag.activate(userId)
    tag.associatePet(petId)

    await this.tags.save(tag)
    await this.invalidation.invalidateByPublicId(tag.publicId.value)

    await this.audit.log({
      userId,
      action: 'tag_activate_by_code',
      entity: 'nfc_tag',
      entityId: tag.id,
      metadata: { petId, publicId: tag.publicId.value },
    })

    return tag
  }
}
