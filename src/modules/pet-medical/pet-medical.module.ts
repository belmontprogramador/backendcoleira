import { Module } from '@nestjs/common'
import { PetsModule } from '../pets/pets.module'
import { SubscriptionsModule } from '../subscriptions/subscriptions.module'
import { PET_MEDICAL_REPOSITORY_PORT } from './domain/repositories/pet-medical.repository.port'
import { PrismaPetMedicalRepository } from './infrastructure/repositories/prisma-pet-medical.repository'
import { GetPetMedicalUseCase } from './application/use-cases/get-pet-medical.use-case'
import { UpsertPetMedicalUseCase } from './application/use-cases/upsert-pet-medical.use-case'
import { PetMedicalController } from './presentation/controllers/pet-medical.controller'

/**
 * Módulo de dados médicos do pet (feature Premium `PET_MEDICAL`).
 * Importa `PetsModule` (ownership) e `SubscriptionsModule` (`FEATURE_ACCESS_PORT`).
 */
@Module({
  imports: [PetsModule, SubscriptionsModule],
  controllers: [PetMedicalController],
  providers: [
    PrismaPetMedicalRepository,
    {
      provide: PET_MEDICAL_REPOSITORY_PORT,
      useClass: PrismaPetMedicalRepository,
    },
    GetPetMedicalUseCase,
    UpsertPetMedicalUseCase,
  ],
})
export class PetMedicalModule {}
