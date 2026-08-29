import { Pet } from '../../domain/entities/pet.entity'
import { PetSpecies } from '../../domain/value-objects/pet-species.vo'
import { PetPrivacy } from '../../domain/value-objects/pet-privacy.vo'
import type { PetSex } from '../../domain/value-objects/pet-sex.vo'
import type { PetModel } from '../../../../generated/prisma/models/Pet'

type PetWithPrivacy = PetModel & {
  privacy?: {
    show_phone: boolean
    show_email: boolean
    show_city: boolean
    show_medical: boolean
    show_veterinarian: boolean
    show_behavior: boolean
    show_contacts: boolean
  } | null
}

/**
 * Converte o agregado `Pet` (domínio) para o formato de persistência Prisma
 * e vice-versa. Mantém o domínio desacoplado dos tipos do ORM.
 */
export class PetMapper {
  static toPersistence(pet: Pet): {
    id: string
    owner_id: string
    name: string
    species: string
    breed: string | null
    sex: PetSex | null
    birth_date: Date | null
    photo_url: string | null
    description: string | null
    city: string | null
    lost_status: boolean
    created_at: Date
    updated_at: Date
    deleted_at: Date | null
  } {
    return {
      id: pet.id,
      owner_id: pet.ownerId,
      name: pet.name,
      species: pet.species.value,
      breed: pet.breed,
      sex: pet.sex,
      birth_date: pet.birthDate,
      photo_url: pet.photoUrl,
      description: pet.description,
      city: pet.city,
      lost_status: pet.lostStatus,
      created_at: pet.createdAt,
      updated_at: pet.updatedAt,
      deleted_at: pet.deletedAt,
    }
  }

  static privacyToPersistence(pet: Pet): {
    show_phone: boolean
    show_email: boolean
    show_city: boolean
    show_medical: boolean
    show_veterinarian: boolean
    show_behavior: boolean
    show_contacts: boolean
  } {
    return {
      show_phone: pet.privacy.showPhone,
      show_email: pet.privacy.showEmail,
      show_city: pet.privacy.showCity,
      show_medical: pet.privacy.showMedical,
      show_veterinarian: pet.privacy.showVeterinarian,
      show_behavior: pet.privacy.showBehavior,
      show_contacts: pet.privacy.showContacts,
    }
  }

  static toDomain(model: PetWithPrivacy): Pet {
    return Pet.reconstitute({
      id: model.id,
      ownerId: model.owner_id,
      name: model.name,
      species: PetSpecies.create(model.species),
      breed: model.breed,
      sex: model.sex,
      birthDate: model.birth_date,
      photoUrl: model.photo_url,
      description: model.description,
      city: model.city,
      lostStatus: model.lost_status,
      privacy: model.privacy
        ? PetPrivacy.reconstitute({
            showPhone: model.privacy.show_phone,
            showEmail: model.privacy.show_email,
            showCity: model.privacy.show_city,
            showMedical: model.privacy.show_medical,
            showVeterinarian: model.privacy.show_veterinarian,
            showBehavior: model.privacy.show_behavior,
            showContacts: model.privacy.show_contacts,
          })
        : PetPrivacy.create(),
      createdAt: model.created_at,
      updatedAt: model.updated_at,
      deletedAt: model.deleted_at,
    })
  }
}
