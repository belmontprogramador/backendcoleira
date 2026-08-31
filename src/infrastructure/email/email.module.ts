import { Global, Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { EMAIL_SENDER_PORT } from '../../common/ports/email-sender.port'
import { LogEmailSender } from './log-email.sender'
import { SmtpEmailSender } from './smtp-email.sender'

/**
 * Provê o envio de e-mail atrás da porta `EMAIL_SENDER_PORT`. Global — usado
 * por register (users) e por recuperação de senha (auth).
 *
 * Seleção de implementação (DIP): com `SMTP_HOST` definido usa
 * `SmtpEmailSender` (produção, nodemailer); caso contrário, cai no
 * `LogEmailSender` (desenvolvimento).
 */
@Global()
@Module({
  providers: [
    LogEmailSender,
    SmtpEmailSender,
    {
      provide: EMAIL_SENDER_PORT,
      inject: [ConfigService, LogEmailSender, SmtpEmailSender],
      useFactory: (
        config: ConfigService,
        log: LogEmailSender,
        smtp: SmtpEmailSender,
      ) => {
        return config.get<string>('SMTP_HOST') ? smtp : log
      },
    },
  ],
  exports: [EMAIL_SENDER_PORT],
})
export class EmailModule {}
