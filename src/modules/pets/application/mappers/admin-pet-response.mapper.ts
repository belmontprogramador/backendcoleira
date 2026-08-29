import type { Pet } from '../../domain/entities/pet.entity'
import type { PetOwnerInfo } from '../../domain/repositories/pet-owner-info.port'
import { PetResponseMapper } from './pet-response.mapper'
import type { PetResponse } from './pet-response.mapper'

export interface AdminPetOwnerResponse {
  id: string
  name: string
  email: string
}

/**
 * Resposta administrativa de pet: acrescenta o dono (`owner`) ao `PetResponse`
 * público. Usada apenas pelas rotas `/admin/pets` (ADMIN+).
 */
export interface AdminPetResponse extends PetResponse {
  owner: AdminPetOwnerResponse | null
}

/**
 * Converte o agregado `Pet` + a info do dono em DTO de resposta admin.
 * Reusa `PetResponseMapper` para os campos públicos do pet.
 */
export class AdminPetResponseMapper {
  static toResponse(pet: Pet, owner: PetOwnerInfo | null): AdminPetResponse {
    return {
      ...PetResponseMapper.toResponse(pet),
      owner: owner
        ? { id: owner.id, name: owner.name, email: owner.email }
        : null,
    }
  }
}
