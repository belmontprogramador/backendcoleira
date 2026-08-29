import { PetContact } from '../../domain/entities/pet-contact.entity'
import type { PetContactModel } from '../../../../generated/prisma/models/PetContact'

/**
 * Converte a entidade `PetContact` (domínio) para o formato de persistência
 * Prisma (snake_case) e vice-versa.
 */
export class PetContactMapper {
  static toPersistence(contact: PetContact): {
    id: string
    pet_id: string
    name: string
    phone: string | null
    email: string | null
    relationship: string | null
    is_primary: boolean
    created_at: Date
    updated_at: Date
  } {
    return {
      id: contact.id,
      pet_id: contact.petId,
      name: contact.name,
      phone: contact.phone,
      email: contact.email,
      relationship: contact.relationship,
      is_primary: contact.isPrimary,
      created_at: contact.createdAt,
      updated_at: contact.updatedAt,
    }
  }

  static toDomain(model: PetContactModel): PetContact {
    return PetContact.reconstitute({
      id: model.id,
      petId: model.pet_id,
      name: model.name,
      phone: model.phone,
      email: model.email,
      relationship: model.relationship,
      isPrimary: model.is_primary,
      createdAt: model.created_at,
      updatedAt: model.updated_at,
    })
  }
}
