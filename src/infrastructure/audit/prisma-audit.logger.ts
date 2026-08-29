import { Injectable } from '@nestjs/common'
import { PrismaService } from '../database/prisma.service'
import type { AuditLoggerPort } from '../../common/ports/audit-logger.port'

/**
 * Implementação concreta da auditoria gravando em `AuditLog` (Prisma).
 */
@Injectable()
export class PrismaAuditLogger implements AuditLoggerPort {
  constructor(private readonly prisma: PrismaService) {}

  async log(entry: {
    userId?: string | null
    action: string
    entity: string
    entityId?: string | null
    metadata?: Record<string, unknown>
    ipHash?: string | null
  }): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        user_id: entry.userId ?? null,
        action: entry.action,
        entity: entry.entity,
        entity_id: entry.entityId ?? null,
        metadata: entry.metadata ? (entry.metadata as never) : undefined,
        ip_hash: entry.ipHash ?? null,
      },
    })
  }
}
