import { Global, Module } from '@nestjs/common'
import { EMAIL_SENDER_PORT } from '../../common/ports/email-sender.port'
import { LogEmailSender } from './log-email.sender'

/**
 * Provê o envio de e-mail atrás da porta `EMAIL_SENDER_PORT`. Global — usado
 * por register (users) e por recuperação de senha (auth).
 */
@Global()
@Module({
  providers: [
    LogEmailSender,
    { provide: EMAIL_SENDER_PORT, useExisting: LogEmailSender },
  ],
  exports: [EMAIL_SENDER_PORT],
})
export class EmailModule {}
