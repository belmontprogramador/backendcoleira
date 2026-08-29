import type { PetContact } from '../../domain/entities/pet-contact.entity'

/**
 * Mapeia a entidade `PetContact` para a resposta da API (camelCase).
 */
export class PetContactResponseMapper {
  static toResponse(contact: PetContact) {
    return {
      id: contact.id,
      petId: contact.petId,
      name: contact.name,
      phone: contact.phone,
      email: contact.email,
      relationship: contact.relationship,
      isPrimary: contact.isPrimary,
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt,
    }
  }
}
