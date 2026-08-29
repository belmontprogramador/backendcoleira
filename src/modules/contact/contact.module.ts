import { Module } from '@nestjs/common'
import { NfcModule } from '../nfc/nfc.module'
import { PetsModule } from '../pets/pets.module'
import { UsersModule } from '../users/users.module'
import { CONTACT_MESSAGE_REPOSITORY_PORT } from './domain/repositories/contact-message.repository.port'
import { PrismaContactMessageRepository } from './infrastructure/repositories/prisma-contact-message.repository'
import { SendContactMessageUseCase } from './application/use-cases/send-contact-message.use-case'
import { ListContactMessagesUseCase } from './application/use-cases/list-contact-messages.use-case'
import { GetContactMessageUseCase } from './application/use-cases/get-contact-message.use-case'
import { MarkContactMessageReadUseCase } from './application/use-cases/mark-contact-message-read.use-case'
import { ContactController } from './presentation/controllers/contact.controller'
import { ContactsController } from './presentation/controllers/contacts.controller'

/**
 * Módulo Contact (Fase 6) — mensagens de contato visitante → tutor (RF14).
 * Provê a implementação concreta atrás da porta (DIP) e os use cases de envio
 * e inbox do tutor.
 */
@Module({
  imports: [NfcModule, PetsModule, UsersModule],
  controllers: [ContactController, ContactsController],
  providers: [
    PrismaContactMessageRepository,
    {
      provide: CONTACT_MESSAGE_REPOSITORY_PORT,
      useClass: PrismaContactMessageRepository,
    },
    SendContactMessageUseCase,
    ListContactMessagesUseCase,
    GetContactMessageUseCase,
    MarkContactMessageReadUseCase,
  ],
  exports: [
    CONTACT_MESSAGE_REPOSITORY_PORT,
    SendContactMessageUseCase,
    ListContactMessagesUseCase,
    GetContactMessageUseCase,
    MarkContactMessageReadUseCase,
  ],
})
export class ContactModule {}
