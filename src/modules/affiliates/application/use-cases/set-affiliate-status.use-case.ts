import { Inject, Injectable } from '@nestjs/common'
import { AFFILIATE_REPOSITORY_PORT } from '../../domain/repositories/affiliate.repository.port'
import type { AffiliateRepositoryPort } from '../../domain/repositories/affiliate.repository.port'
import { AUDIT_LOGGER_PORT } from '../../../../common/ports/audit-logger.port'
import type { AuditLoggerPort } from '../../../../common/ports/audit-logger.port'
import type { Affiliate } from '../../domain/entities/affiliate.entity'
import { AffiliateNotFoundError } from '../errors'

/**
 * Caso de uso: ativar/desativar um afiliado (admin).
 */
@Injectable()
export class SetAffiliateStatusUseCase {
  constructor(
    @Inject(AFFILIATE_REPOSITORY_PORT)
    private readonly affiliates: AffiliateRepositoryPort,
    @Inject(AUDIT_LOGGER_PORT) private readonly audit: AuditLoggerPort,
  ) {}

  async execute(id: string, status: 'ACTIVE' | 'INACTIVE'): Promise<Affiliate> {
    const affiliate = await this.affiliates.findById(id)
    if (!affiliate) {
      throw new AffiliateNotFoundError()
    }

    if (status === 'ACTIVE') {
      affiliate.activate()
    } else {
      affiliate.deactivate()
    }

    const saved = await this.affiliates.save(affiliate)
    await this.audit.log({
      action: 'affiliate_status_change',
      entity: 'affiliate',
      entityId: saved.id,
      metadata: { status },
    })
    return saved
  }
}
