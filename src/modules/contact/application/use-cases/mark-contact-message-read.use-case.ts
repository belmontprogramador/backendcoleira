import { Inject, Injectable } from '@nestjs/common'
import { CONTACT_MESSAGE_REPOSITORY_PORT } from '../../domain/repositories/contact-message.repository.port'
import type { ContactMessageRepositoryPort } from '../../domain/repositories/contact-message.repository.port'
import { PET_REPOSITORY_PORT } from '../../../pets/domain/repositories/pet.repository.port'
import type { PetRepositoryPort } from '../../../pets/domain/repositories/pet.repository.port'
import type { ContactMessage } from '../../domain/entities/contact-message.entity'
import { ContactMessageNotFoundError } from '../errors'
import { PetNotFoundError } from '../../../pets/application/errors'
import { PetOwnership } from '../../../pets/application/policies/pet-ownership.policy'

/**
 * Caso de uso: marcar uma mensagem de contato como lida (RF14, Basic).
 * Anti-IDOR: resolve o pet e valida `pet.ownerId === actorId`. A regra de
 * idempotência (`markRead` preserva a primeira leitura) vive na entidade.
 */
@Injectable()
export class MarkContactMessageReadUseCase {
  constructor(
    @Inject(CONTACT_MESSAGE_REPOSITORY_PORT)
    private readonly messages: ContactMessageRepositoryPort,
    @Inject(PET_REPOSITORY_PORT) private readonly pets: PetRepositoryPort,
  ) {}

  async execute(actorId: string, messageId: string): Promise<ContactMessage> {
    const message = await this.messages.findById(messageId)
    if (!message) {
      throw new ContactMessageNotFoundError(messageId)
    }

    const pet = await this.pets.findById(message.petId)
    if (!pet) {
      throw new PetNotFoundError(message.petId)
    }
    PetOwnership.assertOwner(pet, actorId)

    message.markRead()
    await this.messages.save(message)

    return message
  }
}
