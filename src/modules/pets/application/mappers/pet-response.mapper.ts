import type { Pet } from '../../domain/entities/pet.entity'

export interface PetResponse {
  id: string
  name: string
  species: string
  breed: string | null
  sex: string | null
  birthDate: Date | null
  photoUrl: string | null
  description: string | null
  city: string | null
  lostStatus: boolean
  privacy: {
    showPhone: boolean
    showEmail: boolean
    showCity: boolean
    showMedical: boolean
    showVeterinarian: boolean
    showBehavior: boolean
    showContacts: boolean
  }
  createdAt: Date
  updatedAt: Date
}

/**
 * Converte o agregado `Pet` em DTO de resposta seguro.
 * NÃO expõe `ownerId` na resposta do dono? Ele é implícito (rota do próprio
 * usuário). Mantemos os dados públicos do pet + privacidade.
 */
export class PetResponseMapper {
  static toResponse(pet: Pet): PetResponse {
    return {
      id: pet.id,
      name: pet.name,
      species: pet.species.value,
      breed: pet.breed,
      sex: pet.sex,
      birthDate: pet.birthDate,
      photoUrl: pet.photoUrl,
      description: pet.description,
      city: pet.city,
      lostStatus: pet.lostStatus,
      privacy: {
        showPhone: pet.privacy.showPhone,
        showEmail: pet.privacy.showEmail,
        showCity: pet.privacy.showCity,
        showMedical: pet.privacy.showMedical,
        showVeterinarian: pet.privacy.showVeterinarian,
        showBehavior: pet.privacy.showBehavior,
        showContacts: pet.privacy.showContacts,
      },
      createdAt: pet.createdAt,
      updatedAt: pet.updatedAt,
    }
  }
}
