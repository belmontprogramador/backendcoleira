import type { ContactMessage } from '../entities/contact-message.entity'

/**
 * Porta do repositório de mensagens de contato.
 */
export interface ContactMessageRepositoryPort {
  save(message: ContactMessage): Promise<void>
  findById(id: string): Promise<ContactMessage | null>
  listByPet(
    petId: string,
    page: number,
    limit: number,
  ): Promise<ContactMessage[]>
  listByOwner(
    ownerId: string,
    page: number,
    limit: number,
  ): Promise<ContactMessage[]>
}

export const CONTACT_MESSAGE_REPOSITORY_PORT = Symbol(
  'CONTACT_MESSAGE_REPOSITORY_PORT',
)
