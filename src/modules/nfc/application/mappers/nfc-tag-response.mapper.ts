import type { NfcTag } from '../../domain/entities/nfc-tag.entity'

export interface NfcTagResponse {
  id: string
  publicId: string
  uid: string | null
  status: string
  batchId: string | null
  ownerId: string | null
  petId: string | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Converte o agregado `NfcTag` em DTO de resposta seguro.
 * NUNCA expõe `activationCodeEncrypted`.
 */
export class NfcTagResponseMapper {
  static toResponse(tag: NfcTag): NfcTagResponse {
    return {
      id: tag.id,
      publicId: tag.publicId.value,
      uid: tag.uid?.value ?? null,
      status: tag.status,
      batchId: tag.batchId,
      ownerId: tag.ownerId,
      petId: tag.petId,
      createdAt: tag.createdAt,
      updatedAt: tag.updatedAt,
    }
  }
}
