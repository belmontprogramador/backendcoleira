import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../../infrastructure/database/prisma.service'
import type { Batch } from '../../domain/entities/batch.entity'
import type { BatchRepositoryPort } from '../../domain/repositories/batch.repository.port'
import { BatchMapper } from '../mappers/batch.mapper'

/**
 * Implementação concreta do `BatchRepositoryPort` usando Prisma 7.
 */
@Injectable()
export class PrismaBatchRepository implements BatchRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Batch | null> {
    const model = await this.prisma.batch.findUnique({ where: { id } })
    return model ? BatchMapper.toDomain(model) : null
  }

  async findByName(name: string): Promise<Batch | null> {
    const model = await this.prisma.batch.findUnique({ where: { name } })
    return model ? BatchMapper.toDomain(model) : null
  }

  async list(): Promise<Batch[]> {
    const models = await this.prisma.batch.findMany({
      orderBy: { created_at: 'desc' },
    })
    return models.map(BatchMapper.toDomain)
  }

  async save(batch: Batch): Promise<void> {
    const data = BatchMapper.toPersistence(batch)
    await this.prisma.batch.upsert({
      where: { id: batch.id },
      create: data,
      update: data,
    })
  }
}
