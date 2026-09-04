import { Global, Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { WHATSAPP_SENDER_PORT } from '../../common/ports/whatsapp-sender.port'
import type { WhatsAppSenderPort } from '../../common/ports/whatsapp-sender.port'
import { LogWhatsAppSender } from './log-whatsapp.sender'
import { EvolutionApiClient } from './evolution-api.client'
import { EvolutionWhatsAppSender } from './evolution-whatsapp.sender'
import { WhatsAppConnectionService } from './whatsapp-connection.service'
import { WhatsAppAdminController } from './whatsapp-admin.controller'

/**
 * Provê o envio de WhatsApp atrás da porta `WHATSAPP_SENDER_PORT` (global).
 *
 * Factory real/mock (mesmo padrão do Mercado Pago): com `EVOLUTION_API_URL` +
 * `EVOLUTION_API_KEY` presentes → `EvolutionWhatsAppSender`; senão →
 * `LogWhatsAppSender`.
 *
 * Também expõe `WhatsAppConnectionService` (QR + estado) e o controller admin
 * (SUPER_ADMIN) para conectar a instância única do número da Elopet.
 */
@Global()
@Module({
  controllers: [WhatsAppAdminController],
  providers: [
    {
      provide: EvolutionApiClient,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new EvolutionApiClient(
          config.get<string>('EVOLUTION_API_URL') ?? '',
          config.get<string>('EVOLUTION_API_KEY') ?? '',
        ),
    },
    {
      provide: WHATSAPP_SENDER_PORT,
      inject: [EvolutionApiClient, ConfigService],
      useFactory: (
        client: EvolutionApiClient,
        config: ConfigService,
      ): WhatsAppSenderPort => {
        if (client.isConfigured()) {
          const instance =
            config.get<string>('EVOLUTION_INSTANCE_NAME') ?? 'elopet'
          return new EvolutionWhatsAppSender(client, instance)
        }
        return new LogWhatsAppSender()
      },
    },
    WhatsAppConnectionService,
  ],
  exports: [WHATSAPP_SENDER_PORT, WhatsAppConnectionService],
})
export class WhatsAppModule {}
