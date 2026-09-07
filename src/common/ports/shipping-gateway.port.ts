/**
 * Porta do gateway de frete (Melhor Envio) — desacoplada do módulo `orders`.
 *
 * Expõe o pipeline de logística (cotação → carrinho → checkout → geração →
 * impressão → rastreio). A implementação real (`MelhorEnvioGateway`) gerencia o
 * OAuth (refresh-on-401) via `ShippingTokenStorePort`; sem configuração, o
 * módulo provê `MockShippingGateway`.
 */

export interface ShippingAddress {
  name: string
  phone: string
  email: string
  document?: string
  postalCode: string
  address: string
  city: string
  stateAbbr: string
}

export interface ShippingVolume {
  width: number
  height: number
  length: number
  weight: number
  insurance: number
  quantity?: number
}

export interface ShippingProduct {
  id: string
  name: string
  width: number
  height: number
  length: number
  weight: number
  insuranceValue: number
  unitaryValue: number
  quantity: number
}

export interface CalculateQuoteInput {
  fromPostalCode: string
  toPostalCode: string
  products?: ShippingProduct[]
  volumes?: ShippingVolume[]
  services?: string
}

export interface ShippingQuote {
  id: number
  name: string
  priceCents: number
  customPriceCents: number
  discountCents: number
  currency: string
  deliveryTime: number
  customDeliveryTime: number
  company: { id: number; name: string; picture: string }
}

export interface CreateShipmentInput {
  service: number
  from: ShippingAddress
  to: ShippingAddress
  products?: ShippingProduct[]
  volumes?: ShippingVolume[]
}

export interface CreateShipmentResult {
  orderId: string
  protocol: string
}

export interface TrackingInfo {
  id: string
  protocol: string
  status: string
  tracking: string | null
  melhorenvioTracking: string | null
  createdAt: string
  paidAt: string | null
  generatedAt: string | null
  postedAt: string | null
  deliveredAt: string | null
  canceledAt: string | null
  expiredAt: string | null
}

export interface ShippingGatewayPort {
  calculateQuote(input: CalculateQuoteInput): Promise<ShippingQuote[]>
  createShipment(input: CreateShipmentInput): Promise<CreateShipmentResult>
  payShipment(orderIds: string[]): Promise<void>
  generateLabel(orderIds: string[]): Promise<void>
  printLabel(mode: 'private' | 'public', orderIds: string[]): Promise<string>
  track(orderIds: string[]): Promise<Record<string, TrackingInfo>>
}

export const SHIPPING_GATEWAY_PORT = Symbol('SHIPPING_GATEWAY_PORT')
