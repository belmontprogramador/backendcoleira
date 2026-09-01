import type { PublicProfile } from '../../domain/value-objects/public-profile.vo'

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
}

/**
 * Converte o `PublicProfile` (VO) para o contrato público da API em
 * snake_case (doc-sistema §perfil-privacidade / plano-perfil-publico §5.4).
 *
 * NÃO expõe a flag interna `kind` nem dados administrativos.
 */
export class PublicProfileResponseMapper {
  static toResponse(
    profile: PublicProfile,
    contactEnabled: boolean,
  ): PublicProfileResponse {
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
    }
  }
}
