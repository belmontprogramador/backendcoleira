import { Module } from '@nestjs/common'
import { PetsModule } from '../pets/pets.module'
import { SubscriptionsModule } from '../subscriptions/subscriptions.module'
import { PET_CONTACT_REPOSITORY_PORT } from './domain/repositories/pet-contact.repository.port'
import { PrismaPetContactRepository } from './infrastructure/repositories/prisma-pet-contact.repository'
import { ListPetContactsUseCase } from './application/use-cases/list-pet-contacts.use-case'
import { CreatePetContactUseCase } from './application/use-cases/create-pet-contact.use-case'
import { UpdatePetContactUseCase } from './application/use-cases/update-pet-contact.use-case'
import { DeletePetContactUseCase } from './application/use-cases/delete-pet-contact.use-case'
import { PetContactsController } from './presentation/controllers/pet-contacts.controller'

/**
 * Módulo de contatos do pet (feature Premium `MULTIPLE_CONTACTS`).
 * Importa `PetsModule` (ownership) e `SubscriptionsModule` (`FEATURE_ACCESS_PORT`).
 */
@Module({
  imports: [PetsModule, SubscriptionsModule],
  controllers: [PetContactsController],
  providers: [
    PrismaPetContactRepository,
    {
      provide: PET_CONTACT_REPOSITORY_PORT,
      useClass: PrismaPetContactRepository,
    },
    ListPetContactsUseCase,
    CreatePetContactUseCase,
    UpdatePetContactUseCase,
    DeletePetContactUseCase,
  ],
})
export class PetContactsModule {}
