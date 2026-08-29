import { NfcTag, TagStatus } from '../../domain/entities/nfc-tag.entity'
import { PublicId } from '../../domain/value-objects/public-id.vo'
import { Uid } from '../../domain/value-objects/uid.vo'
import type { NfcTagModel } from '../../../../generated/prisma/models/NfcTag'
import type { TagStatus as PrismaTagStatus } from '../../../../generated/prisma/enums'

/**
 * Converte o agregado `NfcTag` (domínio) para o formato de persistência Prisma
 * e vice-versa.
 */
export class NfcTagMapper {
  static toPersistence(tag: NfcTag): {
    id: string
    public_id: string
    uid: string | null
    activation_code_encrypted: string
    status: PrismaTagStatus
    batch_id: string | null
    owner_id: string | null
    pet_id: string | null
    activated_at: Date | null
    deactivated_at: Date | null
    created_at: Date
    updated_at: Date
  } {
    return {
      id: tag.id,
      public_id: tag.publicId.value,
      uid: tag.uid?.value ?? null,
      activation_code_encrypted: tag.activationCodeEncrypted,
      status: tag.status,
      batch_id: tag.batchId,
      owner_id: tag.ownerId,
      pet_id: tag.petId,
      activated_at: tag.activatedAt,
      deactivated_at: tag.deactivatedAt,
      created_at: tag.createdAt,
      updated_at: tag.updatedAt,
    }
  }

  static toDomain(model: NfcTagModel): NfcTag {
    return NfcTag.reconstitute({
      id: model.id,
      publicId: PublicId.create(model.public_id),
      uid: model.uid ? Uid.create(model.uid) : null,
      activationCodeEncrypted: model.activation_code_encrypted,
      status: model.status as TagStatus,
      batchId: model.batch_id,
      ownerId: model.owner_id,
      petId: model.pet_id,
      activatedAt: model.activated_at,
      deactivatedAt: model.deactivated_at,
      createdAt: model.created_at,
      updatedAt: model.updated_at,
    })
  }
}
