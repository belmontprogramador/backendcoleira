import { Inject, Injectable } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { PET_REPOSITORY_PORT } from '../../domain/repositories/pet.repository.port'
import type { PetRepositoryPort } from '../../domain/repositories/pet.repository.port'
import { AUDIT_LOGGER_PORT } from '../../../../common/ports/audit-logger.port'
import type { AuditLoggerPort } from '../../../../common/ports/audit-logger.port'
import { Pet } from '../../domain/entities/pet.entity'
import { PetSpecies } from '../../domain/value-objects/pet-species.vo'
import type { PetSex } from '../../domain/value-objects/pet-sex.vo'

export interface CreatePetInput {
  name: string
  species: string
  breed?: string
  sex?: PetSex
  birthDate?: string
  description?: string
  city?: string
}

/**
 * Caso de uso: criar um pet vinculado ao usuário autenticado (ownership).
 * A privacy é criada junto com os defaults do domínio.
 */
@Injectable()
export class CreatePetUseCase {
  constructor(
    @Inject(PET_REPOSITORY_PORT) private readonly pets: PetRepositoryPort,
    @Inject(AUDIT_LOGGER_PORT) private readonly audit: AuditLoggerPort,
  ) {}

  async execute(actorId: string, input: CreatePetInput): Promise<Pet> {
    const pet = Pet.create({
      id: randomUUID(),
      ownerId: actorId,
      name: input.name,
      species: PetSpecies.create(input.species),
      breed: input.breed ?? null,
      sex: input.sex ?? null,
      birthDate: input.birthDate ? new Date(input.birthDate) : null,
      description: input.description ?? null,
      city: input.city ?? null,
    })

    await this.pets.save(pet)
    await this.audit.log({
      action: 'create',
      entity: 'pet',
      entityId: pet.id,
      metadata: { ownerId: actorId },
    })

    return pet
  }
}
