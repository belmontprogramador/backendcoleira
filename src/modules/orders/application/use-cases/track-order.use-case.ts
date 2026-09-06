import { Inject, Injectable } from '@nestjs/common'
import {
  SHIPPING_GATEWAY_PORT,
  type ShippingGatewayPort,
  type TrackingInfo,
} from '../../../../common/ports/shipping-gateway.port'
import {
  SHIPMENT_REPOSITORY_PORT,
  type ShipmentRepositoryPort,
} from '../../domain/repositories/shipment.repository.port'

export interface TrackOrderInput {
  orderId: string
}

/**
 * Consulta o rastreio ao vivo de um pedido.
 *
 * Resolve o `meOrderId` do `Shipment` e delega ao `ShippingGatewayPort.track`.
 * Sem envio registrado → `null` (a jornada ainda não tem rastreio).
 */
@Injectable()
export class TrackOrderUseCase {
  constructor(
    @Inject(SHIPMENT_REPOSITORY_PORT)
    private readonly shipments: ShipmentRepositoryPort,
    @Inject(SHIPPING_GATEWAY_PORT)
    private readonly shipping: ShippingGatewayPort,
  ) {}

  async execute(
    input: TrackOrderInput,
  ): Promise<Record<string, TrackingInfo> | null> {
    const shipment = await this.shipments.findByOrderId(input.orderId)
    if (!shipment) {
      return null
    }
    return this.shipping.track([shipment.meOrderId])
  }
}
