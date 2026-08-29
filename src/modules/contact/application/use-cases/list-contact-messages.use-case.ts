import { Inject, Injectable } from '@nestjs/common'
import { CONTACT_MESSAGE_REPOSITORY_PORT } from '../../domain/repositories/contact-message.repository.port'
import type { ContactMessageRepositoryPort } from '../../domain/repositories/contact-message.repository.port'
import { PET_REPOSITORY_PORT } from '../../../pets/domain/repositories/pet.repository.port'
import type { PetRepositoryPort } from '../../../pets/domain/repositories/pet.repository.port'
import type { ContactMessage } from '../../domain/entities/contact-message.entity'
import { PetNotFoundError } from '../../../pets/application/errors'
import { PetOwnership } from '../../../pets/application/policies/pet-ownership.policy'

export interface ListContactMessagesInput {
  actorId: string
  petId?: string
  page: number
  limit: number
}

/**
 * Caso de uso: listar mensagens de contato do tutor (RF14, Basic).
 * - Com `petId`: valida ownership do pet (anti-IDOR) e lista por pet.
 * - Sem `petId`: lista o inbox geral (todas as mensagens dos pets do ator).
 */
@Injectable()
export class ListContactMessagesUseCase {
  constructor(
    @Inject(CONTACT_MESSAGE_REPOSITORY_PORT)
    private readonly messages: ContactMessageRepositoryPort,
    @Inject(PET_REPOSITORY_PORT) private readonly pets: PetRepositoryPort,
  ) {}

  async execute(input: ListContactMessagesInput): Promise<ContactMessage[]> {
    if (input.petId) {
      const pet = await this.pets.findById(input.petId)
      if (!pet) {
        throw new PetNotFoundError(input.petId)
      }
      PetOwnership.assertOwner(pet, input.actorId)
      return this.messages.listByPet(input.petId, input.page, input.limit)
    }
    return this.messages.listByOwner(input.actorId, input.page, input.limit)
  }
}
