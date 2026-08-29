import { Module } from '@nestjs/common'
import { PetsModule } from '../pets/pets.module'
import { SubscriptionsModule } from '../subscriptions/subscriptions.module'
import { ACCESS_EVENT_REPOSITORY_PORT } from './domain/repositories/access-event.repository.port'
import { PrismaAccessEventRepository } from './infrastructure/repositories/prisma-access-event.repository'
import { RegisterAccessEventUseCase } from './application/use-cases/register-access-event.use-case'
import { ListAccessEventsUseCase } from './application/use-cases/list-access-events.use-case'
import { AccessEventsController } from './presentation/controllers/access-events.controller'

/**
 * Módulo AccessEvent — registro de acesso (Fase 6) + histórico Premium
 * `ACCESS_HISTORY` (Fase 7). Importa `PetsModule` (ownership) e
 * `SubscriptionsModule` (`FEATURE_ACCESS_PORT`).
 */
@Module({
  imports: [PetsModule, SubscriptionsModule],
  controllers: [AccessEventsController],
  providers: [
    PrismaAccessEventRepository,
    {
      provide: ACCESS_EVENT_REPOSITORY_PORT,
      useClass: PrismaAccessEventRepository,
    },
    RegisterAccessEventUseCase,
    ListAccessEventsUseCase,
  ],
  exports: [ACCESS_EVENT_REPOSITORY_PORT, RegisterAccessEventUseCase],
})
export class AccessEventsModule {}
