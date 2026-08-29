import { Global, Module } from '@nestjs/common'
import { AUDIT_LOGGER_PORT } from '../../common/ports/audit-logger.port'
import { PrismaAuditLogger } from './prisma-audit.logger'

/**
 * Provê a auditoria atrás da porta `AUDIT_LOGGER_PORT`. Global — usada por
 * vários módulos (users, auth).
 */
@Global()
@Module({
  providers: [
    PrismaAuditLogger,
    { provide: AUDIT_LOGGER_PORT, useExisting: PrismaAuditLogger },
  ],
  exports: [AUDIT_LOGGER_PORT],
})
export class AuditModule {}
