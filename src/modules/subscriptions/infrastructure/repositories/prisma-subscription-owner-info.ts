import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../../infrastructure/database/prisma.service'
import type {
  SubscriptionOwnerInfo,
  SubscriptionOwnerInfoPort,
} from '../../domain/repositories/subscription-owner-info.port'

/**
 * Implementação concreta do `SubscriptionOwnerInfoPort` usando Prisma 7.
 * Consulta apenas id/name/email dos donos (sem dados sensíveis).
 */
@Injectable()
export class PrismaSubscriptionOwnerInfo implements SubscriptionOwnerInfoPort {
  constructor(private readonly prisma: PrismaService) {}

  async findByIds(ids: string[]): Promise<SubscriptionOwnerInfo[]> {
    if (ids.length === 0) {
      return []
    }
    return this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, email: true },
    })
  }
}
