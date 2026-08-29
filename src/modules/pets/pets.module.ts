import { Module } from '@nestjs/common'
import { PET_REPOSITORY_PORT } from './domain/repositories/pet.repository.port'
import { PET_OWNER_INFO_PORT } from './domain/repositories/pet-owner-info.port'
import { PET_STORAGE_PORT } from './infrastructure/storage/pet-storage.port'
import { PrismaPetRepository } from './infrastructure/repositories/prisma-pet.repository'
import { PrismaPetOwnerInfo } from './infrastructure/repositories/prisma-pet-owner-info'
import { LocalPetStorageService } from './infrastructure/storage/local-pet-storage.service'
import { CreatePetUseCase } from './application/use-cases/create-pet.use-case'
import { GetPetUseCase } from './application/use-cases/get-pet.use-case'
import { ListUserPetsUseCase } from './application/use-cases/list-user-pets.use-case'
import { UpdatePetUseCase } from './application/use-cases/update-pet.use-case'
import { DeletePetUseCase } from './application/use-cases/delete-pet.use-case'
import { SetLostStatusUseCase } from './application/use-cases/set-lost-status.use-case'
import { UpdatePrivacyUseCase } from './application/use-cases/update-privacy.use-case'
import { UploadPhotoUseCase } from './application/use-cases/upload-photo.use-case'
import { ListAllPetsUseCase } from './application/use-cases/list-all-pets.use-case'
import { AdminGetPetUseCase } from './application/use-cases/admin-get-pet.use-case'
import { AdminPetResponseAssembler } from './application/assemblers/admin-pet-response.assembler'
import { PetsController } from './presentation/controllers/pets.controller'
import { AdminPetsController } from './presentation/controllers/admin-pets.controller'

/**
 * Provê as implementações concretas atrás das portas (DIP) e expõe os
 * casos de uso para outros módulos.
 */
@Module({
  controllers: [PetsController, AdminPetsController],
  providers: [
    PrismaPetRepository,
    { provide: PET_REPOSITORY_PORT, useClass: PrismaPetRepository },
    PrismaPetOwnerInfo,
    { provide: PET_OWNER_INFO_PORT, useClass: PrismaPetOwnerInfo },
    { provide: PET_STORAGE_PORT, useClass: LocalPetStorageService },
    AdminPetResponseAssembler,
    CreatePetUseCase,
    GetPetUseCase,
    ListUserPetsUseCase,
    UpdatePetUseCase,
    DeletePetUseCase,
    SetLostStatusUseCase,
    UpdatePrivacyUseCase,
    UploadPhotoUseCase,
    ListAllPetsUseCase,
    AdminGetPetUseCase,
  ],
  exports: [
    PET_REPOSITORY_PORT,
    PET_OWNER_INFO_PORT,
    PET_STORAGE_PORT,
    CreatePetUseCase,
    GetPetUseCase,
    ListUserPetsUseCase,
    UpdatePetUseCase,
    DeletePetUseCase,
    SetLostStatusUseCase,
    UpdatePrivacyUseCase,
    UploadPhotoUseCase,
    ListAllPetsUseCase,
    AdminGetPetUseCase,
  ],
})
export class PetsModule {}
