import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../../infrastructure/database/prisma.service'
import type { AccessEvent } from '../../domain/entities/access-event.entity'
import type { AccessEventRepositoryPort } from '../../domain/repositories/access-event.repository.port'
import { AccessEventMapper } from '../mappers/access-event.mapper'

/**
 * Implementação concreta do `AccessEventRepositoryPort` usando Prisma 7.
 * Append-only — apenas `create`.
 */
@Injectable()
export class PrismaAccessEventRepository implements AccessEventRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(event: AccessEvent): Promise<void> {
    await this.prisma.accessEvent.create({
      data: AccessEventMapper.toPersistence(event),
    })
  }

  async listByPet(petId: string): Promise<AccessEvent[]> {
    const models = await this.prisma.accessEvent.findMany({
      where: { pet_id: petId },
      orderBy: { created_at: 'desc' },
    })
    return models.map(AccessEventMapper.toDomain)
  }
}
