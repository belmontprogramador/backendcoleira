import { Inject, Injectable } from '@nestjs/common'
import { AFFILIATE_REPOSITORY_PORT } from '../../domain/repositories/affiliate.repository.port'
import type { AffiliateRepositoryPort } from '../../domain/repositories/affiliate.repository.port'
import type { Affiliate } from '../../domain/entities/affiliate.entity'
import { AffiliateNotFoundError } from '../errors'

/**
 * Caso de uso: detalhar um afiliado (admin).
 */
@Injectable()
export class GetAffiliateUseCase {
  constructor(
    @Inject(AFFILIATE_REPOSITORY_PORT)
    private readonly affiliates: AffiliateRepositoryPort,
  ) {}

  async execute(id: string): Promise<Affiliate> {
    const affiliate = await this.affiliates.findById(id)
    if (!affiliate) {
      throw new AffiliateNotFoundError()
    }
    return affiliate
  }
}
