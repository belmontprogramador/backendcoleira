import { Inject, Injectable } from '@nestjs/common'
import { MelhorEnvioClient } from './melhor-envio.client'
import { SHIPPING_TOKEN_STORE_PORT } from './shipping-token-store.port'
import type { ShippingTokenStorePort } from './shipping-token-store.port'

/**
 * Orquestra o OAuth da Melhor Envio (Authorization Code).
 *
 * - `authorize(state?)` → monta a URL de autorização (redirect do navegador).
 * - `callback(code)`    → troca o `code` por access/refresh tokens e persiste
 *   na credencial única (`ShippingTokenStorePort`).
 */
@Injectable()
export class ShippingOAuthService {
  constructor(
    private readonly client: MelhorEnvioClient,
    @Inject(SHIPPING_TOKEN_STORE_PORT)
    private readonly tokenStore: ShippingTokenStorePort,
  ) {}

  authorize(state?: string): string | null {
    return this.client.buildAuthorizeUrl(state)
  }

  async callback(code: string): Promise<void> {
    const tokens = await this.client.exchangeAuthorizationCode(code)
    await this.tokenStore.save({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: new Date(Date.now() + (tokens.expires_in ?? 2592000) * 1000),
    })
  }

  async isConnected(): Promise<boolean> {
    const credential = await this.tokenStore.get()
    return credential !== null
  }

  async disconnect(): Promise<void> {
    await this.tokenStore.delete()
  }
}
