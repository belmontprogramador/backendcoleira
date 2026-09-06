import { Inject, Injectable } from '@nestjs/common'
import {
  SHIPPING_GATEWAY_PORT,
  type ShippingGatewayPort,
  type ShippingQuote,
} from '../../../../common/ports/shipping-gateway.port'
import { SHIPPING_ORIGIN_POSTAL_CODE_PORT } from '../../../../common/ports/shipping-origin.port'
import { PINGENTE_PACKAGE } from '../../domain/constants/pingente-package'

export interface QuoteOrderInput {
  postalCode: string
  quantity: number
}

/**
 * Cotação de frete do pingente (`POST /orders/quote`).
 *
 * Consulta a Melhor Envio em tempo real; o CEP de origem vem da config
 * (`MELHOR_ENVIO_FROM_POSTAL_CODE`). Preços retornados em centavos (já no
 * formato camelCase da `ShippingGatewayPort`).
 */
@Injectable()
export class QuoteOrderUseCase {
  constructor(
    @Inject(SHIPPING_GATEWAY_PORT)
    private readonly shipping: ShippingGatewayPort,
    @Inject(SHIPPING_ORIGIN_POSTAL_CODE_PORT)
    private readonly originPostalCode: string,
  ) {}

  async execute(input: QuoteOrderInput): Promise<ShippingQuote[]> {
    const toPostalCode = input.postalCode.replace(/\D/g, '')
    return this.shipping.calculateQuote({
      fromPostalCode: this.originPostalCode,
      toPostalCode,
      products: [{ ...PINGENTE_PACKAGE, quantity: input.quantity }],
    })
  }
}
