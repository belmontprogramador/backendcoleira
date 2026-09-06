import { Inject, Injectable } from '@nestjs/common'
import { PrismaService } from '../database/prisma.service'
import type { StoredShippingCredential } from './shipping-token-store.port'
import type { ShippingTokenStorePort } from './shipping-token-store.port'
import { SHIPPING_TOKEN_CIPHER_PORT } from './shipping-token-cipher.port'
import type { ShippingTokenCipherPort } from './shipping-token-cipher.port'

/**
 * Id fixo da linha única de `shipping_credentials` (OAuth single-account).
 * O Elopet tem uma única conta Melhor Envio — sempre existe no máximo 1 linha.
 */
export const SHIPPING_CREDENTIAL_ID = 'shipping-credential'

/**
 * Implementação do `ShippingTokenStorePort` usando Prisma 7.
 * Os tokens ficam cifrados (AES-256-GCM) em repouso — nunca em texto puro.
 */
@Injectable()
export class PrismaShippingTokenStore implements ShippingTokenStorePort {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(SHIPPING_TOKEN_CIPHER_PORT)
    private readonly cipher: ShippingTokenCipherPort,
  ) {}

  async get(): Promise<StoredShippingCredential | null> {
    const row = await this.prisma.shippingCredential.findFirst()
    if (!row) {
      return null
    }
    return {
      accessToken: this.cipher.decrypt(row.access_token),
      refreshToken: this.cipher.decrypt(row.refresh_token),
      expiresAt: row.expires_at,
    }
  }

  async save(credential: StoredShippingCredential): Promise<void> {
    const accessToken = this.cipher.encrypt(credential.accessToken)
    const refreshToken = this.cipher.encrypt(credential.refreshToken)

    await this.prisma.shippingCredential.upsert({
      where: { id: SHIPPING_CREDENTIAL_ID },
      create: {
        id: SHIPPING_CREDENTIAL_ID,
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: credential.expiresAt,
      },
      update: {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: credential.expiresAt,
      },
    })
  }

  async delete(): Promise<void> {
    await this.prisma.shippingCredential.deleteMany({
      where: { id: SHIPPING_CREDENTIAL_ID },
    })
  }
}
