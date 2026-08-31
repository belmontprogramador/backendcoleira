import { Module } from '@nestjs/common'
import { ActivateTagUseCase } from './application/use-cases/activate-tag.use-case'
import { ActivateTagByCodeUseCase } from './application/use-cases/activate-tag-by-code.use-case'
import { AssociatePetUseCase } from './application/use-cases/associate-pet.use-case'
import { DisassociatePetUseCase } from './application/use-cases/disassociate-pet.use-case'
import { RequestTransferUseCase } from './application/use-cases/request-transfer.use-case'
import { AcceptTransferUseCase } from './application/use-cases/accept-transfer.use-case'
import { UnlinkTagUseCase } from './application/use-cases/unlink-tag.use-case'
import { ReplaceTagUseCase } from './application/use-cases/replace-tag.use-case'
import { OwnershipController } from './presentation/controllers/ownership.controller'
import { NfcModule } from '../nfc/nfc.module'
import { UsersModule } from '../users/users.module'
import { PetsModule } from '../pets/pets.module'

/**
 * Módulo de ativação e ownership (Fase 4).
 * Reusa portas e use cases dos módulos Nfc, Users e Pets (DIP).
 */
@Module({
  imports: [NfcModule, UsersModule, PetsModule],
  controllers: [OwnershipController],
  providers: [
    ActivateTagUseCase,
    ActivateTagByCodeUseCase,
    AssociatePetUseCase,
    DisassociatePetUseCase,
    RequestTransferUseCase,
    AcceptTransferUseCase,
    UnlinkTagUseCase,
    ReplaceTagUseCase,
  ],
  exports: [
    ActivateTagUseCase,
    ActivateTagByCodeUseCase,
    AssociatePetUseCase,
    DisassociatePetUseCase,
    RequestTransferUseCase,
    AcceptTransferUseCase,
    UnlinkTagUseCase,
    ReplaceTagUseCase,
  ],
})
export class OwnershipModule {}
