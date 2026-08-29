import { AccessEvent } from '../../domain/entities/access-event.entity'
import { AccessSource } from '../../../../common/constants/access-source'
import type { AccessEventModel } from '../../../../generated/prisma/models/AccessEvent'

/**
 * Converte a entidade `AccessEvent` (domínio) para o formato de persistência
 * Prisma (snake_case) e vice-versa.
 */
export class AccessEventMapper {
  static toPersistence(event: AccessEvent): {
    id: string
    pet_id: string | null
    nfc_tag_id: string | null
    source: AccessSource
    device_type: string | null
    ip_hash: string | null
    location_approx: string | null
    created_at: Date
  } {
    return {
      id: event.id,
      pet_id: event.petId,
      nfc_tag_id: event.nfcTagId,
      source: event.source,
      device_type: event.deviceType,
      ip_hash: event.ipHash,
      location_approx: event.locationApprox,
      created_at: event.createdAt,
    }
  }

  static toDomain(model: AccessEventModel): AccessEvent {
    return AccessEvent.reconstitute({
      id: model.id,
      petId: model.pet_id,
      nfcTagId: model.nfc_tag_id,
      source: model.source as AccessSource,
      deviceType: model.device_type,
      ipHash: model.ip_hash,
      locationApprox: model.location_approx,
      createdAt: model.created_at,
    })
  }
}
