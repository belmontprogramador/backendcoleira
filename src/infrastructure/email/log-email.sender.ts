import { Injectable, Logger } from '@nestjs/common'
import type {
  ContactMessageEmailData,
  EmailSenderPort,
} from '../../common/ports/email-sender.port'

/**
 * Implementação de e-mail baseada em log (desenvolvimento).
 * Em produção, substituir por SMTP/SES — a porta `EmailSenderPort` permanece.
 */
@Injectable()
export class LogEmailSender implements EmailSenderPort {
  private readonly logger = new Logger(LogEmailSender.name)

  sendVerificationEmail(to: string, token: string): Promise<void> {
    this.logger.log(`[verificação de e-mail] para=${to} token=${token}`)
    return Promise.resolve()
  }

  sendPasswordResetEmail(to: string, token: string): Promise<void> {
    this.logger.log(`[recuperação de senha] para=${to} token=${token}`)
    return Promise.resolve()
  }

  sendAdminPasswordResetEmail(to: string, newPassword: string): Promise<void> {
    this.logger.log(
      `[reset de senha por admin] para=${to} novaSenha=${newPassword}`,
    )
    return Promise.resolve()
  }

  sendTransferEmail(to: string, token: string): Promise<void> {
    this.logger.log(`[transferência de pingente] para=${to} token=${token}`)
    return Promise.resolve()
  }

  sendContactMessageEmail(
    to: string,
    data: ContactMessageEmailData,
  ): Promise<void> {
    this.logger.log(
      `[contato] para=${to} pet=${data.petName} de=${data.senderName ?? 'anônimo'}`,
    )
    return Promise.resolve()
  }
}
