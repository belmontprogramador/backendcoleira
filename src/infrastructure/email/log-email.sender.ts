import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type {
  ContactMessageEmailData,
  EmailSenderPort,
} from '../../common/ports/email-sender.port'

/**
 * Implementação de e-mail baseada em log (desenvolvimento).
 * Em produção, substituir por SMTP/SES — a porta `EmailSenderPort` permanece.
 *
 * Os e-mails transacionais de verificação e redefinição de senha logam o LINK
 * completo (token embutido) além do token cru, para permitir testar o fluxo
 * manualmente sem SMTP real.
 */
@Injectable()
export class LogEmailSender implements EmailSenderPort {
  private readonly logger = new Logger(LogEmailSender.name)

  constructor(private readonly config: ConfigService) {}

  private get frontendUrl(): string {
    return this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3001'
  }

  sendVerificationEmail(to: string, token: string): Promise<void> {
    const link = `${this.frontendUrl}/verificar-email?token=${token}`
    this.logger.log(
      `[verificação de e-mail] para=${to} token=${token} link=${link}`,
    )
    return Promise.resolve()
  }

  sendPasswordResetEmail(to: string, token: string): Promise<void> {
    const link = `${this.frontendUrl}/resetar-senha?token=${token}`
    this.logger.log(
      `[recuperação de senha] para=${to} token=${token} link=${link}`,
    )
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
      `[contato] para=${to} pet=${data.petName} de=${data.senderName ?? 'anônimo'} localização=${data.location ?? '—'}`,
    )
    return Promise.resolve()
  }
}
