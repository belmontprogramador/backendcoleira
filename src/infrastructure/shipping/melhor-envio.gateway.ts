import { Inject, Injectable, Logger } from '@nestjs/common'
import { ShippingGatewayError } from '../../common/errors/shipping-gateway.error'
import type {
  CalculateQuoteInput,
  CreateShipmentInput,
  CreateShipmentResult,
  ShippingAddress,
  ShippingGatewayPort,
  ShippingProduct,
  ShippingQuote,
  ShippingVolume,
  TrackingInfo,
} from '../../common/ports/shipping-gateway.port'
import { SHIPPING_TOKEN_STORE_PORT } from './shipping-token-store.port'
import type { ShippingTokenStorePort } from './shipping-token-store.port'
import { MelhorEnvioApiError, MelhorEnvioClient } from './melhor-envio.client'
import type {
  CalculateQuotationInput,
  CartAddress,
  CartInput,
  Quotation,
  TrackingInfo as RawTrackingInfo,
} from './melhor-envio.client'

function toCents(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') {
    return null
  }
  const parsed = parseFloat(String(value))
  if (Number.isNaN(parsed)) {
    return null
  }
  return Math.round(parsed * 100)
}

function toAddress(address: ShippingAddress): CartAddress {
  return {
    name: address.name,
    phone: address.phone,
    email: address.email,
    ...(address.document ? { document: address.document } : {}),
    postal_code: address.postalCode,
    address: address.address,
    city: address.city,
    state_abbr: address.stateAbbr,
  }
}

function toProducts(products?: ShippingProduct[]) {
  if (!products) {
    return undefined
  }
  return products.map((p) => ({
    id: p.id,
    width: p.width,
    height: p.height,
    length: p.length,
    weight: p.weight,
    insurance_value: p.insuranceValue,
    quantity: p.quantity,
  }))
}

function toVolumes(volumes?: ShippingVolume[]) {
  if (!volumes) {
    return undefined
  }
  return volumes.map((v) => ({
    width: v.width,
    height: v.height,
    length: v.length,
    weight: v.weight,
    insurance: v.insurance,
    ...(v.quantity !== undefined ? { quantity: v.quantity } : {}),
  }))
}

/**
 * Implementação real do `ShippingGatewayPort` (Melhor Envio).
 * Gerencia o OAuth: lê o access token do `ShippingTokenStorePort` e, em 401,
 * renova via refresh token e re-tenta uma vez.
 */
@Injectable()
export class MelhorEnvioGateway implements ShippingGatewayPort {
  private readonly logger = new Logger(MelhorEnvioGateway.name)

  constructor(
    private readonly client: MelhorEnvioClient,
    @Inject(SHIPPING_TOKEN_STORE_PORT)
    private readonly tokenStore: ShippingTokenStorePort,
  ) {}

  async calculateQuote(input: CalculateQuoteInput): Promise<ShippingQuote[]> {
    const body: CalculateQuotationInput = {
      from: { postal_code: input.fromPostalCode },
      to: { postal_code: input.toPostalCode },
      ...(input.products ? { products: toProducts(input.products) } : {}),
      ...(input.volumes ? { volumes: toVolumes(input.volumes) } : {}),
      ...(input.services ? { services: input.services } : {}),
    }
    const quotes = await this.withToken((token) =>
      this.client.calculateShipping(body, token),
    )
    return quotes
      .map((q) => this.toQuote(q))
      .filter((q): q is ShippingQuote => q !== null)
  }

  async createShipment(
    input: CreateShipmentInput,
  ): Promise<CreateShipmentResult> {
    const body: CartInput = {
      service: input.service,
      from: toAddress(input.from),
      to: toAddress(input.to),
      ...(input.products ? { products: toProducts(input.products) } : {}),
      ...(input.volumes ? { volumes: toVolumes(input.volumes) } : {}),
    }
    const res = await this.withToken((token) =>
      this.client.addToCart(body, token),
    )
    return { orderId: res.id, protocol: res.protocol }
  }

  async payShipment(orderIds: string[]): Promise<void> {
    await this.withToken((token) => this.client.checkout(orderIds, token))
  }

  async generateLabel(orderIds: string[]): Promise<void> {
    await this.withToken((token) => this.client.generateLabels(orderIds, token))
  }

  async printLabel(
    mode: 'private' | 'public',
    orderIds: string[],
  ): Promise<string> {
    const res = await this.withToken((token) =>
      this.client.printLabels(mode, orderIds, token),
    )
    return res.url
  }

  async track(orderIds: string[]): Promise<Record<string, TrackingInfo>> {
    const raw = await this.withToken((token) =>
      this.client.trackOrders(orderIds, token),
    )
    return this.mapTracking(raw)
  }

  private toQuote(q: Quotation): ShippingQuote | null {
    // A ME exige usar `custom_price` (reflete taxas/descontos), com fallback
    // para `price`. Quando a transportadora NÃO cota, ambos vêm `null`.
    const effectivePrice = toCents(q.custom_price) ?? toCents(q.price)
    if (effectivePrice === null) {
      return null
    }
    const effectiveDeliveryTime =
      q.custom_delivery_time ?? q.delivery_time ?? 0
    return {
      id: q.id,
      name: q.name,
      priceCents: effectivePrice,
      customPriceCents: effectivePrice,
      discountCents: toCents(q.discount) ?? 0,
      currency: q.currency ?? 'R$',
      deliveryTime: effectiveDeliveryTime,
      customDeliveryTime: effectiveDeliveryTime,
      company: q.company,
    }
  }

  private mapTracking(
    raw: Record<string, RawTrackingInfo>,
  ): Record<string, TrackingInfo> {
    const result: Record<string, TrackingInfo> = {}
    for (const [id, t] of Object.entries(raw)) {
      result[id] = {
        id: t.id,
        protocol: t.protocol,
        status: t.status,
        tracking: t.tracking,
        melhorenvioTracking: t.melhorenvio_tracking,
        createdAt: t.created_at,
        paidAt: t.paid_at,
        generatedAt: t.generated_at,
        postedAt: t.posted_at,
        deliveredAt: t.delivered_at,
        canceledAt: t.canceled_at,
        expiredAt: t.expired_at,
      }
    }
    return result
  }

  private async withToken<T>(fn: (token: string) => Promise<T>): Promise<T> {
    const credential = await this.tokenStore.get()
    if (!credential) {
      throw new ShippingGatewayError(
        'Credencial OAuth da Melhor Envio não configurada — conecte a conta no admin',
      )
    }

    try {
      return await fn(credential.accessToken)
    } catch (error) {
      if (error instanceof MelhorEnvioApiError && error.status === 401) {
        this.logger.warn(
          'Melhor Envio respondeu 401 — renovando token e re-tentando',
        )
        await this.refresh()
        const fresh = await this.tokenStore.get()
        if (!fresh) {
          throw new ShippingGatewayError(
            'Falha ao renovar o token da Melhor Envio',
          )
        }
        return await fn(fresh.accessToken)
      }
      if (error instanceof MelhorEnvioApiError) {
        throw new ShippingGatewayError(`Melhor Envio: ${error.message}`)
      }
      throw error
    }
  }

  private async refresh(): Promise<void> {
    const credential = await this.tokenStore.get()
    if (!credential) {
      throw new ShippingGatewayError('Sem refresh token da Melhor Envio')
    }
    const tokens = await this.client.refreshAccessToken(credential.refreshToken)
    await this.tokenStore.save({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: new Date(Date.now() + (tokens.expires_in ?? 2592000) * 1000),
    })
  }
}
