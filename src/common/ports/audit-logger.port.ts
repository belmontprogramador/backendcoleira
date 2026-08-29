/**
 * Porta de auditoria.
 * DIP: a aplicação depende desta abstração. A implementação grava em `AuditLog`.
 */
export interface AuditLoggerPort {
  log(entry: {
    userId?: string | null
    action: string
    entity: string
    entityId?: string | null
    metadata?: Record<string, unknown>
    ipHash?: string | null
  }): Promise<void>
}

export const AUDIT_LOGGER_PORT = Symbol('AUDIT_LOGGER_PORT')
