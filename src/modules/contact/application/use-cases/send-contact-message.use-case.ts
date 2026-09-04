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
import { IP_GEOLOCATION_PORT } from '../../../../common/ports/ip-geolocation.port'
import type { IpGeolocationPort } from '../../../../common/ports/ip-geolocation.port'
import { FEATURE_ACCESS_PORT } from '../../../../common/ports/feature-access.port'
import type { FeatureAccessPort } from '../../../../common/ports/feature-access.port'
import { FeatureNotAvailableError } from '../../../../common/errors/feature-not-available.error'
import { CONTACT_MESSAGES_FEATURE } from '../../../../common/constants/features'
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
  ip?: string | null
  ipHash?: string | null
  userAgent?: string | null
  latitude?: number | null
  longitude?: number | null
}

/**
 * Caso de uso: visitante envia uma mensagem de contato ao tutor.
 *
 * Premium-only (`CONTACT_MESSAGES`): o dono do pet precisa ter o plano Premium.
 * Se não tiver, lança `FeatureNotAvailableError` (403) — defesa em profundidade
 * (o front esconde o formulário, mas o backend não confia no front).
 *
 * Fluxo:
 *  1. Resolve tag (`publicId`) → pet → owner.
 *  2. Gate de feature (`CONTACT_MESSAGES`).
 *  3. Resolve a localização aproximada do remetente (IP→geo, best-effort).
 *  4. Persiste a `ContactMessage` (com `locationApprox`).
 *  5. E-mail ao tutor com a mensagem + localização (best-effort).
 *
 * Sem WhatsApp — o canal é somente e-mail. Falha do e-mail nunca derruba o
 * fluxo (a mensagem já foi persistida) — resiliência RNF10.
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
    @Inject(FEATURE_ACCESS_PORT)
    private readonly featureAccess: FeatureAccessPort,
    @Inject(IP_GEOLOCATION_PORT)
    private readonly geolocation: IpGeolocationPort,
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

    // Gate premium (RF14 agora é Premium): só dono Premium recebe contato.
    const hasFeature = await this.featureAccess.hasFeature(
      owner.id,
      CONTACT_MESSAGES_FEATURE,
    )
    if (!hasFeature) {
      throw new FeatureNotAvailableError(CONTACT_MESSAGES_FEATURE)
    }

    // Localização aproximada do remetente (IP→geo, best-effort).
    const locationApprox = await this.geolocation.resolve(input.ip ?? null)

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
      locationApprox,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
    })

    await this.messages.save(message)

    // E-mail: canal único — sempre tenta (a mensagem já está no inbox).
    try {
      await this.email.sendContactMessageEmail(owner.email.value, {
        petName: pet.name,
        senderName: message.senderName,
        senderPhone: message.senderPhone,
        senderEmail: message.senderEmail,
        message: message.message,
        latitude: message.latitude,
        longitude: message.longitude,
      })
    } catch {
      this.logger.warn(
        'Falha ao enviar e-mail de contato; mensagem permanece no inbox',
      )
    }

    return { messageId: message.id }
  }
}
