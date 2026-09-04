import { Logger } from '@nestjs/common'
import type { WhatsAppSenderPort } from '../../common/ports/whatsapp-sender.port'
import { toWhatsAppNumber } from '../../common/utils/phone'
import { EvolutionApiClient } from './evolution-api.client'

/**
 * Implementação real de `WhatsAppSenderPort` via Evolution API (Baileys).
 *
 * Traduz `sendContactMessage(to, message)` → `POST /message/sendText/{instance}`.
 * O `to` (telefone do tutor) é normalizado com `toWhatsAppNumber`: celular BR
 * vira `55DDDnúmero`; fixo/vazio/inválido → **pula o WhatsApp** (o canal
 * e-mail segue). Falha de rede/API é best-effort (nunca derruba o fluxo).
 *
 * Instanciado pela factory do `WhatsAppModule` (não é provider de classe).
 */
export class EvolutionWhatsAppSender implements WhatsAppSenderPort {
  private readonly logger = new Logger(EvolutionWhatsAppSender.name)

  constructor(
    private readonly client: EvolutionApiClient,
    private readonly instanceName: string,
  ) {}

  async sendContactMessage(to: string, message: string): Promise<void> {
    const number = toWhatsAppNumber(to)
    if (!number) {
      this.logger.warn(
        `WhatsApp ignorado: telefone do tutor inválido/fixo (${to ?? 'ausente'})`,
      )
      return
    }

    try {
      await this.client.sendText(this.instanceName, number, message)
    } catch (error) {
      this.logger.error(
        `Falha ao enviar WhatsApp para ${number}: ${String(error)}`,
      )
      // best-effort: o e-mail segue; falha de WhatsApp nunca derruba o fluxo.
    }
  }
}
