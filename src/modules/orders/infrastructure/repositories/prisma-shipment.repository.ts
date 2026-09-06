import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../../infrastructure/database/prisma.service'
import type { Shipment } from '../../domain/entities/shipment.entity'
import type { ShipmentRepositoryPort } from '../../domain/repositories/shipment.repository.port'
import { ShipmentMapper } from '../mappers/shipment.mapper'

/**
 * Implementação concreta do `ShipmentRepositoryPort` usando Prisma 7.
 */
@Injectable()
export class PrismaShipmentRepository implements ShipmentRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async save(shipment: Shipment): Promise<Shipment> {
    const data = ShipmentMapper.toPersistence(shipment)
    const model = await this.prisma.shipment.upsert({
      where: { id: shipment.id },
      create: data,
      update: data,
    })
    return ShipmentMapper.toDomain(model)
  }

  async findByOrderId(orderId: string): Promise<Shipment | null> {
    const model = await this.prisma.shipment.findUnique({
      where: { order_id: orderId },
    })
    return model ? ShipmentMapper.toDomain(model) : null
  }

  async findByMeOrderId(meOrderId: string): Promise<Shipment | null> {
    const model = await this.prisma.shipment.findUnique({
      where: { me_order_id: meOrderId },
    })
    return model ? ShipmentMapper.toDomain(model) : null
  }
}
