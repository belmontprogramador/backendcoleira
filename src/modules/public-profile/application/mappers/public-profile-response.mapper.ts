import type { PublicProfileResult } from '../use-cases/get-public-profile.use-case'

export interface PublicMedicalResponse {
  allergies: string | null
  medications: string | null
  special_care: string | null
  medical_conditions: string | null
  veterinarian_name: string | null
  veterinarian_phone: string | null
}

export interface PublicContactResponse {
  name: string
  phone: string | null
  email: string | null
  relationship: string | null
}

export interface PublicProfileResponse {
  status: string
  pet: {
    name: string
    species: string
    breed: string | null
    sex: string | null
    photo_url: string | null
    description: string | null
    city: string | null
    lost_status: boolean
  } | null
  owner: {
    name: string
    phone: string | null
    email: string | null
  } | null
  message: string | null
  contact_enabled: boolean
  medical: PublicMedicalResponse | null
  contacts: PublicContactResponse[]
  location_approx: string | null
  access_id: string | null
}

/**
 * Converte o `PublicProfileResult` (caso de uso) para o contrato público da
 * API em snake_case (doc-sistema §perfil-privacidade / plano-perfil-publico §5.4).
 *
 * NÃO expõe a flag interna `kind` nem dados administrativos. `medical`/`contacts`
 * já chegam com a privacidade aplicada pelo caso de uso (feature premium + flags).
 */
export class PublicProfileResponseMapper {
  static toResponse(result: PublicProfileResult): PublicProfileResponse {
    const { profile, contactEnabled, medical, contacts, locationApprox, accessId } =
      result
    return {
      status: profile.status,
      pet: profile.pet
        ? {
            name: profile.pet.name,
            species: profile.pet.species,
            breed: profile.pet.breed,
            sex: profile.pet.sex,
            photo_url: profile.pet.photoUrl,
            description: profile.pet.description,
            city: profile.pet.city,
            lost_status: profile.pet.lostStatus,
          }
        : null,
      owner: profile.owner
        ? {
            name: profile.owner.name,
            phone: profile.owner.phone,
            email: profile.owner.email,
          }
        : null,
      message: profile.message,
      contact_enabled: contactEnabled,
      medical: medical
        ? {
            allergies: medical.allergies,
            medications: medical.medications,
            special_care: medical.specialCare,
            medical_conditions: medical.medicalConditions,
            veterinarian_name: medical.veterinarianName,
            veterinarian_phone: medical.veterinarianPhone,
          }
        : null,
      contacts: contacts.map((c) => ({
        name: c.name,
        phone: c.phone,
        email: c.email,
        relationship: c.relationship,
      })),
      location_approx: locationApprox,
      access_id: accessId,
    }
  }
}
