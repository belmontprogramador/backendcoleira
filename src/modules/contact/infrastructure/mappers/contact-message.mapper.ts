import { ContactMessage } from '../../domain/entities/contact-message.entity'
import { AccessSource } from '../../../../common/constants/access-source'
import type { ContactMessageModel } from '../../../../generated/prisma/models/ContactMessage'

/**
 * Converte a entidade `ContactMessage` (domínio) para o formato de persistência
 * Prisma (snake_case) e vice-versa.
 */
export class ContactMessageMapper {
  static toPersistence(message: ContactMessage): {
    id: string
    pet_id: string
    nfc_tag_id: string | null
    sender_name: string | null
    sender_phone: string | null
    sender_email: string | null
    message: string
    source: AccessSource
    ip_hash: string | null
    user_agent: string | null
    location_approx: string | null
    latitude: number | null
    longitude: number | null
    read_at: Date | null
    created_at: Date
  } {
    return {
      id: message.id,
      pet_id: message.petId,
      nfc_tag_id: message.nfcTagId,
      sender_name: message.senderName,
      sender_phone: message.senderPhone,
      sender_email: message.senderEmail,
      message: message.message,
      source: message.source,
      ip_hash: message.ipHash,
      user_agent: message.userAgent,
      location_approx: message.locationApprox,
      latitude: message.latitude,
      longitude: message.longitude,
      read_at: message.readAt,
      created_at: message.createdAt,
    }
  }

  static toDomain(model: ContactMessageModel): ContactMessage {
    return ContactMessage.reconstitute({
      id: model.id,
      petId: model.pet_id,
      nfcTagId: model.nfc_tag_id,
      senderName: model.sender_name,
      senderPhone: model.sender_phone,
      senderEmail: model.sender_email,
      message: model.message,
      source: model.source as AccessSource,
      ipHash: model.ip_hash,
      userAgent: model.user_agent,
      locationApprox: model.location_approx,
      latitude: model.latitude,
      longitude: model.longitude,
      readAt: model.read_at,
      createdAt: model.created_at,
    })
  }
}
