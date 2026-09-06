import { Shipment } from '../../domain/entities/shipment.entity'
import type { ShipmentStatus } from '../../domain/value-objects/shipment-status.vo'
import type { ShipmentModel } from '../../../../generated/prisma/models/Shipment'

/**
 * Converte a entidade `Shipment` (domínio) para o formato de persistência
 * Prisma (snake_case) e vice-versa.
 */
export class ShipmentMapper {
  static toPersistence(shipment: Shipment): {
    id: string
    order_id: string
    me_order_id: string
    protocol: string
    service_id: number
    status: ShipmentStatus
    tracking: string | null
    tracking_url: string | null
    label_url: string | null
    created_at: Date
    updated_at: Date
  } {
    return {
      id: shipment.id,
      order_id: shipment.orderId,
      me_order_id: shipment.meOrderId,
      protocol: shipment.protocol,
      service_id: shipment.serviceId,
      status: shipment.status,
      tracking: shipment.tracking,
      tracking_url: shipment.trackingUrl,
      label_url: shipment.labelUrl,
      created_at: shipment.createdAt,
      updated_at: shipment.updatedAt,
    }
  }

  static toDomain(model: ShipmentModel): Shipment {
    return Shipment.reconstitute({
      id: model.id,
      orderId: model.order_id,
      meOrderId: model.me_order_id,
      protocol: model.protocol,
      serviceId: model.service_id,
      status: model.status,
      tracking: model.tracking,
      trackingUrl: model.tracking_url,
      labelUrl: model.label_url,
      createdAt: model.created_at,
      updatedAt: model.updated_at,
    })
  }
}
