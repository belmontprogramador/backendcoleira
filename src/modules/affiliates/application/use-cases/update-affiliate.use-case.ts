import { Inject, Injectable } from '@nestjs/common'
import { AFFILIATE_REPOSITORY_PORT } from '../../domain/repositories/affiliate.repository.port'
import type { AffiliateRepositoryPort } from '../../domain/repositories/affiliate.repository.port'
import { CommissionConfig } from '../../domain/value-objects/commission-config.vo'
import type { Affiliate } from '../../domain/entities/affiliate.entity'
import type { UpdateAffiliateDto } from '../dtos/update-affiliate.schema'
import {
  AffiliateEmailAlreadyInUseError,
  AffiliateNotFoundError,
} from '../errors'

/**
 * Caso de uso: atualizar um afiliado (admin).
 *
 * Edita dados cadastrais, config de comissão e piso de saque. `code` é imutável.
 */
@Injectable()
export class UpdateAffiliateUseCase {
  constructor(
    @Inject(AFFILIATE_REPOSITORY_PORT)
    private readonly affiliates: AffiliateRepositoryPort,
  ) {}

  async execute(id: string, dto: UpdateAffiliateDto): Promise<Affiliate> {
    const affiliate = await this.affiliates.findById(id)
    if (!affiliate) {
      throw new AffiliateNotFoundError()
    }

    if (dto.email && dto.email !== affiliate.email) {
      const existing = await this.affiliates.findByEmail(dto.email)
      if (existing && existing.id !== id) {
        throw new AffiliateEmailAlreadyInUseError()
      }
    }

    affiliate.updateDetails({
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      document: dto.document,
      pixKey: dto.pixKey,
      bankName: dto.bankName,
      bankAgency: dto.bankAgency,
      bankAccount: dto.bankAccount,
    })

    if (
      dto.commissionType !== undefined ||
      dto.commissionFixedCents !== undefined ||
      dto.commissionPercentBps !== undefined
    ) {
      affiliate.changeCommission(
        CommissionConfig.create({
          type: dto.commissionType ?? affiliate.commission.type,
          fixedCents:
            dto.commissionFixedCents ?? affiliate.commission.fixedCents,
          percentBps:
            dto.commissionPercentBps ?? affiliate.commission.percentBps,
        }),
      )
    }

    if (dto.minWithdrawalCents !== undefined) {
      affiliate.changeMinWithdrawal(dto.minWithdrawalCents)
    }

    return this.affiliates.save(affiliate)
  }
}
