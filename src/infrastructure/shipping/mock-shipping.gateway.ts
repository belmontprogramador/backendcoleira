import { Injectable } from '@nestjs/common'
import type {
  CalculateQuoteInput,
  CreateShipmentInput,
  CreateShipmentResult,
  ShippingGatewayPort,
  ShippingQuote,
  TrackingInfo,
} from '../../common/ports/shipping-gateway.port'

/**
 * Implementação de teste do `ShippingGatewayPort` — usada quando a Melhor Envio
 * não está configurada (sem `MELHOR_ENVIO_BASE_URL`). Retorna dados fictícios
 * determinísticos (cotações zeradas, etiqueta mock).
 */
@Injectable()
export class MockShippingGateway implements ShippingGatewayPort {
  async calculateQuote(_input: CalculateQuoteInput): Promise<ShippingQuote[]> {
    return [
      {
        id: 1,
        name: 'PAC (mock)',
        priceCents: 0,
        customPriceCents: 0,
        discountCents: 0,
        currency: 'R$',
        deliveryTime: 5,
        customDeliveryTime: 5,
        company: { id: 1, name: 'Correios', picture: '' },
      },
    ]
  }

  async createShipment(
    _input: CreateShipmentInput,
  ): Promise<CreateShipmentResult> {
    return { orderId: 'mock-order-id', protocol: 'mock-protocol' }
  }

  async payShipment(_orderIds: string[]): Promise<void> {}

  async generateLabel(_orderIds: string[]): Promise<void> {}

  async printLabel(
    _mode: 'private' | 'public',
    _orderIds: string[],
  ): Promise<string> {
    return 'https://example.com/etiqueta-mock'
  }

  async track(_orderIds: string[]): Promise<Record<string, TrackingInfo>> {
    return {}
  }
}
