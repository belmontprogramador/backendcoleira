/**
 * Porta de envio de WhatsApp transacional.
 * DIP: implementação concreta (Twilio/WATI) vive na infraestrutura e é plugável.
 */
export interface WhatsAppSenderPort {
  sendContactMessage(to: string, message: string): Promise<void>
}

export const WHATSAPP_SENDER_PORT = Symbol('WHATSAPP_SENDER_PORT')
