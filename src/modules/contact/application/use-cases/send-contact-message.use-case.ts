import { Inject, Injectable, Logger } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { NFC_TAG_REPOSITORY_PORT } from '../../../nfc/domain/repositories/nfc-tag.repository.port'
import type { NfcTagRepositoryPort } from '../../../nfc/domain/repositories/nfc-tag.repository.port'
import { PET_REPOSITORY_PORT } from '../../../pets/domain/repositories/pet.repository.port'
import type { PetRepositoryPort } from '../../../pets/domain/repositories/pet.repository.port'
import { USER_REPOSITORY_PORT } from '../../../users/domain/repositories/user.repository.port'
import type { UserRepositoryPort } from '../../../users/domain/repositories/user.repository.port'
import { CONTACT_MESSAGE_REPOSITORY_PORT } from '../../domain/repositories/contact-message.repository.port'
import type { ContactMessageRepositoryPort } from '../../domain/repositories/contact-message.repository.port'
import { EMAIL_SENDER_PORT } from '../../../../common/ports/email-sender.port'
import type { EmailSenderPort } from '../../../../common/ports/email-sender.port'
import { WHATSAPP_SENDER_PORT } from '../../../../common/ports/whatsapp-sender.port'
import type { WhatsAppSenderPort } from '../../../../common/ports/whatsapp-sender.port'
import { AccessSource } from '../../../../common/constants/access-source'
import { ContactMessage } from '../../domain/entities/contact-message.entity'
import { TagNotFoundError } from '../../../nfc/application/errors'
import { PetNotFoundError } from '../../../pets/application/errors'
import { UserNotFoundError } from '../../../users/application/errors'
import { TagNotActivatedError } from '../errors'

export interface SendContactMessageInput {
  publicId: string
  senderName?: string | null
  senderPhone?: string | null
  senderEmail?: string | null
  message: string
  source: AccessSource
  ipHash?: string | null
  userAgent?: string | null
}

/**
 * Caso de uso: visitante envia uma mensagem de contato ao tutor (RF14, Basic).
 *
 * Fluxo:
 *  1. Resolve tag (`publicId`) → pet → owner (sem expor dados na resposta).
 *  2. Persiste a `ContactMessage` (registro canônico — inbox do tutor).
 *  3. E-mail ao tutor (canal base, best-effort).
 *  4. WhatsApp se `owner.phone` (canal secundário, best-effort).
 *
 * Nunca expõe e-mail/telefone do tutor — retorna apenas `{ messageId }`.
 * Falha de um canal de notificação nunca derruba o fluxo (a mensagem já foi
 * persistida) — resiliência "IDENTIFICAR → CONTATAR nunca para" (RNF10).
 */
@Injectable()
export class SendContactMessageUseCase {
  private readonly logger = new Logger(SendContactMessageUseCase.name)

  constructor(
    @Inject(NFC_TAG_REPOSITORY_PORT)
    private readonly tags: NfcTagRepositoryPort,
    @Inject(PET_REPOSITORY_PORT)
    private readonly pets: PetRepositoryPort,
    @Inject(USER_REPOSITORY_PORT)
    private readonly users: UserRepositoryPort,
    @Inject(CONTACT_MESSAGE_REPOSITORY_PORT)
    private readonly messages: ContactMessageRepositoryPort,
    @Inject(EMAIL_SENDER_PORT)
    private readonly email: EmailSenderPort,
    @Inject(WHATSAPP_SENDER_PORT)
    private readonly whatsapp: WhatsAppSenderPort,
  ) {}

  async execute(
    input: SendContactMessageInput,
  ): Promise<{ messageId: string }> {
    const tag = await this.tags.findByPublicId(input.publicId)
    if (!tag) {
      throw new TagNotFoundError(input.publicId)
    }
    if (!tag.petId) {
      throw new TagNotActivatedError()
    }

    const pet = await this.pets.findById(tag.petId)
    if (!pet) {
      throw new PetNotFoundError(tag.petId)
    }
    if (pet.deletedAt !== null) {
      throw new TagNotActivatedError()
    }

    const owner = await this.users.findById(pet.ownerId)
    if (!owner) {
      throw new UserNotFoundError(pet.ownerId)
    }

    const message = ContactMessage.create({
      id: randomUUID(),
      petId: pet.id,
      nfcTagId: tag.id,
      senderName: input.senderName ?? null,
      senderPhone: input.senderPhone ?? null,
      senderEmail: input.senderEmail ?? null,
      message: input.message,
      source: input.source,
      ipHash: input.ipHash ?? null,
      userAgent: input.userAgent ?? null,
    })

    await this.messages.save(message)

    // E-mail: canal base — sempre tenta (a mensagem já está no inbox).
    try {
      await this.email.sendContactMessageEmail(owner.email.value, {
        petName: pet.name,
        senderName: message.senderName,
        senderPhone: message.senderPhone,
        senderEmail: message.senderEmail,
        message: message.message,
      })
    } catch {
      this.logger.warn(
        'Falha ao enviar e-mail de contato; mensagem permanece no inbox',
      )
    }

    // WhatsApp: canal secundário — apenas se o tutor tem telefone.
    if (owner.phone) {
      try {
        await this.whatsapp.sendContactMessage(
          owner.phone,
          this.buildWhatsAppText(message),
        )
      } catch {
        this.logger.warn(
          'Falha ao enviar WhatsApp de contato; e-mail já enviado',
        )
      }
    }

    return { messageId: message.id }
  }

  private buildWhatsAppText(message: ContactMessage): string {
    const from = message.senderName ? `[${message.senderName}] ` : ''
    return `${from}${message.message}`
  }
}
