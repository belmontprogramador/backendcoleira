import { Inject, Injectable } from '@nestjs/common'
import { WITHDRAWAL_REPOSITORY_PORT } from '../../domain/repositories/withdrawal.repository.port'
import type {
  ListWithdrawalsFilter,
  WithdrawalRepositoryPort,
} from '../../domain/repositories/withdrawal.repository.port'
import type { Withdrawal } from '../../domain/entities/withdrawal.entity'
import type { ListWithdrawalsDto } from '../dtos/list-withdrawals.schema'

export interface PaginatedWithdrawalsResult {
  data: Withdrawal[]
  total: number
  page: number
  limit: number
}

/**
 * Caso de uso: listar saques paginado (admin).
 */
@Injectable()
export class ListWithdrawalsUseCase {
  constructor(
    @Inject(WITHDRAWAL_REPOSITORY_PORT)
    private readonly withdrawals: WithdrawalRepositoryPort,
  ) {}

  async execute(dto: ListWithdrawalsDto): Promise<PaginatedWithdrawalsResult> {
    const filter: ListWithdrawalsFilter = {
      page: dto.page,
      limit: dto.limit,
      status: dto.status,
      affiliateId: dto.affiliateId,
    }

    const [data, total] = await Promise.all([
      this.withdrawals.list(filter),
      this.withdrawals.count(filter),
    ])

    return { data, total, page: dto.page, limit: dto.limit }
  }
}
