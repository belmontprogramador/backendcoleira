import type { Shipment } from '../entities/shipment.entity'

/**
 * Porta do repositório de envios (etiqueta Melhor Envio) — 1:1 com `Order`.
 * DIP: domínio/aplicação dependem desta interface; a implementação (Prisma)
 * vive na infraestrutura.
 */
export interface ShipmentRepositoryPort {
  save(shipment: Shipment): Promise<Shipment>
  findByOrderId(orderId: string): Promise<Shipment | null>
  findByMeOrderId(meOrderId: string): Promise<Shipment | null>
}

export const SHIPMENT_REPOSITORY_PORT = Symbol('SHIPMENT_REPOSITORY_PORT')
