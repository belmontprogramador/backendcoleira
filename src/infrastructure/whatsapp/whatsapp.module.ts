import { Global, Module } from '@nestjs/common'
import { WHATSAPP_SENDER_PORT } from '../../common/ports/whatsapp-sender.port'
import { LogWhatsAppSender } from './log-whatsapp.sender'

/**
 * Provê o envio de WhatsApp atrás da porta `WHATSAPP_SENDER_PORT`. Global —
 * usado pelo envio de contato (contact).
 */
@Global()
@Module({
  providers: [
    LogWhatsAppSender,
    { provide: WHATSAPP_SENDER_PORT, useExisting: LogWhatsAppSender },
  ],
  exports: [WHATSAPP_SENDER_PORT],
})
export class WhatsAppModule {}
