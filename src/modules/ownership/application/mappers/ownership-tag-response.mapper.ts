import type { NfcTag } from '../../../nfc/domain/entities/nfc-tag.entity'

export interface OwnershipTagResponse {
  id: string
  publicId: string
  status: string
  ownerId: string | null
  petId: string | null
  activatedAt: Date | null
}

/**
 * Converte o agregado `NfcTag` em DTO seguro para as rotas de ownership.
 * NUNCA expõe `activationCodeEncrypted`.
 */
export class OwnershipTagResponseMapper {
  static toResponse(tag: NfcTag): OwnershipTagResponse {
    return {
      id: tag.id,
      publicId: tag.publicId.value,
      status: tag.status,
      ownerId: tag.ownerId,
      petId: tag.petId,
      activatedAt: tag.activatedAt,
    }
  }
}
