import { Injectable, Logger } from '@nestjs/common'
import type { WhatsAppSenderPort } from '../../common/ports/whatsapp-sender.port'

/**
 * Implementação de WhatsApp baseada em log (desenvolvimento).
 * Em produção, substituir por Twilio/WATI — a porta `WhatsAppSenderPort` permanece.
 */
@Injectable()
export class LogWhatsAppSender implements WhatsAppSenderPort {
  private readonly logger = new Logger(LogWhatsAppSender.name)

  sendContactMessage(to: string, message: string): Promise<void> {
    this.logger.log(`[WhatsApp contato] para=${to} mensagem=${message}`)
    return Promise.resolve()
  }
}
