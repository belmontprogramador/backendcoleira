import { Global, Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { SHIPPING_GATEWAY_PORT } from '../../common/ports/shipping-gateway.port'
import type {
  ShippingAddress,
  ShippingGatewayPort,
} from '../../common/ports/shipping-gateway.port'
import { SHIPPING_TOKEN_CIPHER_PORT } from './shipping-token-cipher.port'
import { Aes256GcmCipher } from './aes256-gcm-cipher'
import { SHIPPING_TOKEN_STORE_PORT } from './shipping-token-store.port'
import type { ShippingTokenStorePort } from './shipping-token-store.port'
import { PrismaShippingTokenStore } from './prisma-shipping-token.store'
import { SHIPPING_WEBHOOK_VALIDATOR_PORT } from './shipping-webhook-validator.port'
import {
  SHIPPING_ORIGIN_POSTAL_CODE_PORT,
  SHIPPING_ORIGIN_PORT,
} from '../../common/ports/shipping-origin.port'
import { MelhorEnvioWebhookValidator } from './melhor-envio-webhook.validator'
import { MelhorEnvioClient } from './melhor-envio.client'
import { MelhorEnvioGateway } from './melhor-envio.gateway'
import { MockShippingGateway } from './mock-shipping.gateway'
import { ShippingOAuthService } from './shipping-oauth.service'
import { ShippingOAuthController } from './shipping-oauth.controller'

const SHIPPING_USER_AGENT = 'Elopet (contato@elopet.online)'

/**
 * Módulo de consumo da API Melhor Envio (global).
 *
 * Provê o gateway de frete atrás da porta `SHIPPING_GATEWAY_PORT` — real
 * (`MelhorEnvioGateway`, com refresh-on-401) quando `MELHOR_ENVIO_BASE_URL`
 * estiver presente; senão `MockShippingGateway`. Também provê o token store
 * OAuth (`SHIPPING_TOKEN_STORE_PORT`), o cifrador de tokens e o validador de
 * webhook (HMAC).
 */
@Global()
@Module({
  controllers: [ShippingOAuthController],
  providers: [
    {
      provide: MelhorEnvioClient,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new MelhorEnvioClient({
          baseUrl: config.get<string>('MELHOR_ENVIO_BASE_URL') ?? '',
          clientId: config.get<string>('MELHOR_ENVIO_CLIENT_ID') ?? '',
          clientSecret: config.get<string>('MELHOR_ENVIO_CLIENT_SECRET') ?? '',
          redirectUri: config.get<string>('MELHOR_ENVIO_REDIRECT_URI') ?? '',
          userAgent: SHIPPING_USER_AGENT,
        }),
    },
    {
      provide: SHIPPING_TOKEN_CIPHER_PORT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new Aes256GcmCipher(config.get<string>('SHIPPING_TOKEN_ENC_KEY') ?? ''),
    },
    {
      provide: SHIPPING_TOKEN_STORE_PORT,
      useClass: PrismaShippingTokenStore,
    },
    {
      provide: SHIPPING_WEBHOOK_VALIDATOR_PORT,
      useClass: MelhorEnvioWebhookValidator,
    },
    {
      provide: SHIPPING_ORIGIN_POSTAL_CODE_PORT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        config.get<string>('MELHOR_ENVIO_FROM_POSTAL_CODE') ?? '01310100',
    },
    {
      provide: SHIPPING_ORIGIN_PORT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): ShippingAddress => ({
        name: config.get<string>('MELHOR_ENVIO_FROM_NAME') ?? 'Elopet',
        email:
          config.get<string>('MELHOR_ENVIO_FROM_EMAIL') ??
          'contato@elopet.online',
        phone: config.get<string>('MELHOR_ENVIO_FROM_PHONE') ?? '',
        ...(config.get<string>('MELHOR_ENVIO_FROM_DOCUMENT')
          ? { document: config.get<string>('MELHOR_ENVIO_FROM_DOCUMENT') }
          : {}),
        postalCode: (
          config.get<string>('MELHOR_ENVIO_FROM_POSTAL_CODE') ?? '01310100'
        ).replace(/\D/g, ''),
        address: config.get<string>('MELHOR_ENVIO_FROM_ADDRESS') ?? '',
        city: config.get<string>('MELHOR_ENVIO_FROM_CITY') ?? '',
        stateAbbr: (
          config.get<string>('MELHOR_ENVIO_FROM_STATE') ?? ''
        ).toUpperCase(),
      }),
    },
    {
      provide: SHIPPING_GATEWAY_PORT,
      inject: [MelhorEnvioClient, SHIPPING_TOKEN_STORE_PORT],
      useFactory: (
        client: MelhorEnvioClient,
        tokenStore: ShippingTokenStorePort,
      ): ShippingGatewayPort =>
        client.isConfigured()
          ? new MelhorEnvioGateway(client, tokenStore)
          : new MockShippingGateway(),
    },
    ShippingOAuthService,
  ],
  exports: [
    SHIPPING_GATEWAY_PORT,
    SHIPPING_TOKEN_STORE_PORT,
    SHIPPING_WEBHOOK_VALIDATOR_PORT,
    SHIPPING_ORIGIN_POSTAL_CODE_PORT,
    SHIPPING_ORIGIN_PORT,
    MelhorEnvioClient,
  ],
})
export class ShippingModule {}
