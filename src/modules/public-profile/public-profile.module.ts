import { Module } from '@nestjs/common'
import { NfcModule } from '../nfc/nfc.module'
import { PetsModule } from '../pets/pets.module'
import { UsersModule } from '../users/users.module'
import { AccessEventsModule } from '../access-events/access-events.module'
import { SubscriptionsModule } from '../subscriptions/subscriptions.module'
import { PetMedicalModule } from '../pet-medical/pet-medical.module'
import { PetContactsModule } from '../pet-contacts/pet-contacts.module'
import { GetPublicProfileUseCase } from './application/use-cases/get-public-profile.use-case'
import { ReportAccessLocationUseCase } from './application/use-cases/report-access-location.use-case'
import { PublicProfileController } from './presentation/controllers/public-profile.controller'

/**
 * Módulo do perfil público (`GET /p/:publicId`).
 *
 * Depende das portas de repositório de nfc/pets/users (exportadas pelos seus
 * módulos) e do `CACHE_PORT` (global). A invalidação do cache vive no
 * `PublicProfileInvalidationModule` (@Global), registrado separadamente.
 */
@Module({
  imports: [
    NfcModule,
    PetsModule,
    UsersModule,
    AccessEventsModule,
    SubscriptionsModule,
    PetMedicalModule,
    PetContactsModule,
  ],
  controllers: [PublicProfileController],
  providers: [GetPublicProfileUseCase, ReportAccessLocationUseCase],
})
export class PublicProfileModule {}
