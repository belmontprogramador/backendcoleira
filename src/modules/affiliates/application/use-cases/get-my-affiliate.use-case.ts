import { Inject, Injectable } from '@nestjs/common'
import { AFFILIATE_REPOSITORY_PORT } from '../../domain/repositories/affiliate.repository.port'
import type { AffiliateRepositoryPort } from '../../domain/repositories/affiliate.repository.port'
import type { Affiliate } from '../../domain/entities/affiliate.entity'
import { NoAffiliateProfileError } from '../errors'

/**
 * Caso de uso: perfil do próprio afiliado (self).
 * Exige um `Affiliate` ativo vinculado ao `userId` do token.
 */
@Injectable()
export class GetMyAffiliateUseCase {
  constructor(
    @Inject(AFFILIATE_REPOSITORY_PORT)
    private readonly affiliates: AffiliateRepositoryPort,
  ) {}

  async execute(userId: string): Promise<Affiliate> {
    const affiliate = await this.affiliates.findByUserId(userId)
    if (!affiliate || !affiliate.isActive()) {
      throw new NoAffiliateProfileError()
    }
    return affiliate
  }
}
