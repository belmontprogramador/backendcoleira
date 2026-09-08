import { Inject, Injectable } from '@nestjs/common'
import { AFFILIATE_REPOSITORY_PORT } from '../../domain/repositories/affiliate.repository.port'
import type { AffiliateRepositoryPort } from '../../domain/repositories/affiliate.repository.port'
import type { Affiliate } from '../../domain/entities/affiliate.entity'
import type { UpdateMyAffiliateDto } from '../dtos/update-my-affiliate.schema'
import { NoAffiliateProfileError } from '../errors'

/**
 * Caso de uso: atualizar os próprios dados do afiliado (self).
 * Não edita comissão, piso, status nem code (exclusivos do admin).
 */
@Injectable()
export class UpdateMyAffiliateUseCase {
  constructor(
    @Inject(AFFILIATE_REPOSITORY_PORT)
    private readonly affiliates: AffiliateRepositoryPort,
  ) {}

  async execute(
    userId: string,
    dto: UpdateMyAffiliateDto,
  ): Promise<Affiliate> {
    const affiliate = await this.affiliates.findByUserId(userId)
    if (!affiliate || !affiliate.isActive()) {
      throw new NoAffiliateProfileError()
    }

    affiliate.updateDetails({
      name: dto.name,
      phone: dto.phone,
      document: dto.document,
      pixKey: dto.pixKey,
      bankName: dto.bankName,
      bankAgency: dto.bankAgency,
      bankAccount: dto.bankAccount,
    })

    return this.affiliates.save(affiliate)
  }
}
