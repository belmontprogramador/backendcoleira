import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../../infrastructure/database/prisma.service'
import type { NfcTag } from '../../domain/entities/nfc-tag.entity'
import type { NfcTagRepositoryPort } from '../../domain/repositories/nfc-tag.repository.port'
import { NfcTagMapper } from '../mappers/nfc-tag.mapper'
import { TagStatus as PrismaTagStatus } from '../../../../generated/prisma/enums'

/**
 * Implementação concreta do `NfcTagRepositoryPort` usando Prisma 7.
 */
@Injectable()
export class PrismaNfcTagRepository implements NfcTagRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<NfcTag | null> {
    const model = await this.prisma.nfcTag.findUnique({ where: { id } })
    return model ? NfcTagMapper.toDomain(model) : null
  }

  async findByPublicId(publicId: string): Promise<NfcTag | null> {
    const model = await this.prisma.nfcTag.findUnique({
      where: { public_id: publicId.toUpperCase() },
    })
    return model ? NfcTagMapper.toDomain(model) : null
  }

  async findByUid(uid: string): Promise<NfcTag | null> {
    const model = await this.prisma.nfcTag.findUnique({
      where: { uid: uid.toUpperCase() },
    })
    return model ? NfcTagMapper.toDomain(model) : null
  }

  async findNextToWrite(batchId?: string): Promise<NfcTag | null> {
    const model = await this.prisma.nfcTag.findFirst({
      where: {
        status: PrismaTagStatus.CREATED,
        ...(batchId ? { batch_id: batchId } : {}),
      },
      // Tags resetadas primeiro (mais recentes primeiro) — o operador quer
      // regravar o card que acabou de resetar antes de seguir nas novas.
      orderBy: [
        { reset_at: { sort: 'desc', nulls: 'last' } },
        { created_at: 'asc' },
      ],
    })
    return model ? NfcTagMapper.toDomain(model) : null
  }

  async listByBatch(batchId: string): Promise<NfcTag[]> {
    const models = await this.prisma.nfcTag.findMany({
      where: { batch_id: batchId },
      orderBy: { created_at: 'asc' },
    })
    return models.map(NfcTagMapper.toDomain)
  }

  async listByPet(petId: string): Promise<NfcTag[]> {
    const models = await this.prisma.nfcTag.findMany({
      where: { pet_id: petId },
      orderBy: { created_at: 'asc' },
    })
    return models.map(NfcTagMapper.toDomain)
  }

  async listUnactivated(): Promise<NfcTag[]> {
    const models = await this.prisma.nfcTag.findMany({
      where: {
        owner_id: null,
        status: { in: [PrismaTagStatus.AVAILABLE, PrismaTagStatus.DELIVERED] },
      },
      orderBy: { created_at: 'asc' },
    })
    return models.map(NfcTagMapper.toDomain)
  }

  async list(filter: {
    status?: string
    batchId?: string
    page: number
    limit: number
  }): Promise<NfcTag[]> {
    const models = await this.prisma.nfcTag.findMany({
      where: {
        ...(filter.status ? { status: filter.status as never } : {}),
        ...(filter.batchId ? { batch_id: filter.batchId } : {}),
      },
      skip: (filter.page - 1) * filter.limit,
      take: filter.limit,
      orderBy: { created_at: 'desc' },
    })
    return models.map(NfcTagMapper.toDomain)
  }

  async count(filter: { status?: string; batchId?: string }): Promise<number> {
    return this.prisma.nfcTag.count({
      where: {
        ...(filter.status ? { status: filter.status as never } : {}),
        ...(filter.batchId ? { batch_id: filter.batchId } : {}),
      },
    })
  }

  async save(tag: NfcTag): Promise<void> {
    const data = NfcTagMapper.toPersistence(tag)
    await this.prisma.nfcTag.upsert({
      where: { id: tag.id },
      create: data,
      update: data,
    })
  }

  async saveMany(tags: NfcTag[]): Promise<void> {
    if (tags.length === 0) {
      return
    }
    const data = tags.map(NfcTagMapper.toPersistence)
    await this.prisma.nfcTag.createMany({ data, skipDuplicates: true })
  }

  async deleteByBatch(batchId: string): Promise<number> {
    const result = await this.prisma.nfcTag.deleteMany({
      where: { batch_id: batchId },
    })
    return result.count
  }
}
