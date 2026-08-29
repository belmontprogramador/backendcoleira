import { Inject, Injectable } from '@nestjs/common'
import type { Pet } from '../../domain/entities/pet.entity'
import { PET_OWNER_INFO_PORT } from '../../domain/repositories/pet-owner-info.port'
import type {
  PetOwnerInfo,
  PetOwnerInfoPort,
} from '../../domain/repositories/pet-owner-info.port'
import { AdminPetResponseMapper } from '../mappers/admin-pet-response.mapper'
import type { AdminPetResponse } from '../mappers/admin-pet-response.mapper'

/**
 * Monta a resposta administrativa de pets resolvendo os donos em lote
 * (uma única query, sem N+1). Mantém o agregado `Pet` limpo: os dados de
 * exibição do dono (id/name/email) vêm de `PetOwnerInfoPort`.
 */
@Injectable()
export class AdminPetResponseAssembler {
  constructor(
    @Inject(PET_OWNER_INFO_PORT)
    private readonly owners: PetOwnerInfoPort,
  ) {}

  async toResponses(pets: Pet[]): Promise<AdminPetResponse[]> {
    const ownerMap = await this.resolveOwners(pets)
    return pets.map(pet =>
      AdminPetResponseMapper.toResponse(pet, ownerMap.get(pet.ownerId) ?? null),
    )
  }

  async toResponse(pet: Pet): Promise<AdminPetResponse> {
    const owners = await this.owners.findByIds([pet.ownerId])
    return AdminPetResponseMapper.toResponse(pet, owners[0] ?? null)
  }

  private async resolveOwners(pets: Pet[]): Promise<Map<string, PetOwnerInfo>> {
    const ids = [...new Set(pets.map(pet => pet.ownerId))]
    const owners = await this.owners.findByIds(ids)
    return new Map(owners.map(owner => [owner.id, owner]))
  }
}
