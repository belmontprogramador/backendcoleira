import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../../infrastructure/database/prisma.service'
import { Prisma } from '../../../../generated/prisma/client'
import type { Order } from '../../domain/entities/order.entity'
import type {
  ListOrdersFilter,
  OrderRepositoryPort,
} from '../../domain/repositories/order.repository.port'
import { OrderMapper } from '../mappers/order.mapper'

/**
 * Implementação concreta do `OrderRepositoryPort` usando Prisma 7.
 */
@Injectable()
export class PrismaOrderRepository implements OrderRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async save(order: Order): Promise<Order> {
    const data = OrderMapper.toPersistence(order)
    const model = await this.prisma.order.upsert({
      where: { id: order.id },
      create: data,
      update: data,
    })
    return OrderMapper.toDomain(model)
  }

  async findById(id: string): Promise<Order | null> {
    const model = await this.prisma.order.findUnique({ where: { id } })
    return model ? OrderMapper.toDomain(model) : null
  }

  async findByPaymentId(paymentId: string): Promise<Order | null> {
    const model = await this.prisma.order.findUnique({
      where: { payment_id: paymentId },
    })
    return model ? OrderMapper.toDomain(model) : null
  }

  async list(filter: ListOrdersFilter): Promise<Order[]> {
    const models = await this.prisma.order.findMany({
      where: this.buildWhere(filter),
      skip: (filter.page - 1) * filter.limit,
      take: filter.limit,
      orderBy: { created_at: 'desc' },
    })
    return models.map(OrderMapper.toDomain)
  }

  async count(filter: ListOrdersFilter): Promise<number> {
    return this.prisma.order.count({ where: this.buildWhere(filter) })
  }

  private buildWhere(
    filter: ListOrdersFilter,
  ): Prisma.OrderWhereInput | undefined {
    const conditions: Prisma.OrderWhereInput[] = []
    if (filter.status) {
      conditions.push({ status: filter.status })
    }
    if (filter.buyerId) {
      conditions.push({ buyer_id: filter.buyerId })
    }
    return conditions.length > 0 ? { AND: conditions } : undefined
  }
}
