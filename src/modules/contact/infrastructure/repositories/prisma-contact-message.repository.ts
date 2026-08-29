import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../../infrastructure/database/prisma.service'
import type { ContactMessage } from '../../domain/entities/contact-message.entity'
import type { ContactMessageRepositoryPort } from '../../domain/repositories/contact-message.repository.port'
import { ContactMessageMapper } from '../mappers/contact-message.mapper'

/**
 * Implementação concreta do `ContactMessageRepositoryPort` usando Prisma 7.
 *
 * `save` usa `upsert` para cobrir tanto a criação (mensagem nova) quanto a
 * atualização (`markRead()` — a entidade muta `read_at` e o `save` persiste).
 */
@Injectable()
export class PrismaContactMessageRepository implements ContactMessageRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async save(message: ContactMessage): Promise<void> {
    const data = ContactMessageMapper.toPersistence(message)
    await this.prisma.contactMessage.upsert({
      where: { id: message.id },
      create: data,
      update: data,
    })
  }

  async findById(id: string): Promise<ContactMessage | null> {
    const model = await this.prisma.contactMessage.findUnique({
      where: { id },
    })
    return model ? ContactMessageMapper.toDomain(model) : null
  }

  async listByPet(
    petId: string,
    page: number,
    limit: number,
  ): Promise<ContactMessage[]> {
    const models = await this.prisma.contactMessage.findMany({
      where: { pet_id: petId },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { created_at: 'desc' },
    })
    return models.map(ContactMessageMapper.toDomain)
  }

  async listByOwner(
    ownerId: string,
    page: number,
    limit: number,
  ): Promise<ContactMessage[]> {
    const models = await this.prisma.contactMessage.findMany({
      where: { pet: { owner_id: ownerId } },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { created_at: 'desc' },
    })
    return models.map(ContactMessageMapper.toDomain)
  }
}
