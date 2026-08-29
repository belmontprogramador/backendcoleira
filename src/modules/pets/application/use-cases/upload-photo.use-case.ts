import { Inject, Injectable } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { PET_REPOSITORY_PORT } from '../../domain/repositories/pet.repository.port'
import type { PetRepositoryPort } from '../../domain/repositories/pet.repository.port'
import { PET_STORAGE_PORT } from '../../infrastructure/storage/pet-storage.port'
import type { PetStoragePort } from '../../infrastructure/storage/pet-storage.port'
import { AUDIT_LOGGER_PORT } from '../../../../common/ports/audit-logger.port'
import type { AuditLoggerPort } from '../../../../common/ports/audit-logger.port'
import { PUBLIC_PROFILE_INVALIDATION_PORT } from '../../../../common/ports/public-profile-invalidation.port'
import type { PublicProfileInvalidationPort } from '../../../../common/ports/public-profile-invalidation.port'
import type { Pet } from '../../domain/entities/pet.entity'
import { PetNotFoundError } from '../errors'
import { PetOwnership } from '../policies/pet-ownership.policy'

export interface UploadPhotoInput {
  buffer: Buffer
  contentType: string
  extension: string
}

/**
 * Caso de uso: enviar a foto do próprio pet.
 * Depende apenas de `PetStoragePort` — o armazenamento (local/S3) é plugável.
 */
@Injectable()
export class UploadPhotoUseCase {
  constructor(
    @Inject(PET_REPOSITORY_PORT) private readonly pets: PetRepositoryPort,
    @Inject(PET_STORAGE_PORT) private readonly storage: PetStoragePort,
    @Inject(AUDIT_LOGGER_PORT) private readonly audit: AuditLoggerPort,
    @Inject(PUBLIC_PROFILE_INVALIDATION_PORT)
    private readonly invalidation: PublicProfileInvalidationPort,
  ) {}

  async execute(
    actorId: string,
    petId: string,
    input: UploadPhotoInput,
  ): Promise<Pet> {
    const pet = await this.pets.findById(petId)
    if (!pet) {
      throw new PetNotFoundError(petId)
    }
    PetOwnership.assertOwner(pet, actorId)

    const key = `${petId}/${randomUUID()}.${input.extension}`
    const url = await this.storage.upload(key, input.buffer, input.contentType)

    pet.setPhotoUrl(url)
    await this.pets.save(pet)
    await this.invalidation.invalidateByPetId(petId)

    await this.audit.log({
      action: 'photo_upload',
      entity: 'pet',
      entityId: petId,
    })

    return pet
  }
}
