import type { ContactMessage } from '../../domain/entities/contact-message.entity'
import { AccessSource } from '../../../../common/constants/access-source'

/**
 * Resposta de mensagem de contato para o tutor autenticado (camelCase).
 * NUNCA expõe dados internos do visitante: `ipHash`, `userAgent` e `nfcTagId`
 * ficam de fora (privacidade do remetente).
 */
export interface ContactMessageResponse {
  id: string
  petId: string
  senderName: string | null
  senderPhone: string | null
  senderEmail: string | null
  message: string
  source: AccessSource
  isRead: boolean
  readAt: Date | null
  createdAt: Date
}

export class ContactMessageResponseMapper {
  static toResponse(message: ContactMessage): ContactMessageResponse {
    return {
      id: message.id,
      petId: message.petId,
      senderName: message.senderName,
      senderPhone: message.senderPhone,
      senderEmail: message.senderEmail,
      message: message.message,
      source: message.source,
      isRead: message.isRead,
      readAt: message.readAt,
      createdAt: message.createdAt,
    }
  }
}
