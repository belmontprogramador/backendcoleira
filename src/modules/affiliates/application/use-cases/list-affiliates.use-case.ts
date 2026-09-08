import { Inject, Injectable } from '@nestjs/common'
import { AFFILIATE_REPOSITORY_PORT } from '../../domain/repositories/affiliate.repository.port'
import type {
  AffiliateRepositoryPort,
  ListAffiliatesFilter,
} from '../../domain/repositories/affiliate.repository.port'
import type { Affiliate } from '../../domain/entities/affiliate.entity'
import type { ListAffiliatesDto } from '../dtos/list-affiliates.schema'

export interface PaginatedAffiliatesResult {
  data: Affiliate[]
  total: number
  page: number
  limit: number
}

/**
 * Caso de uso: listar afiliados paginado (admin).
 */
@Injectable()
export class ListAffiliatesUseCase {
  constructor(
    @Inject(AFFILIATE_REPOSITORY_PORT)
    private readonly affiliates: AffiliateRepositoryPort,
  ) {}

  async execute(dto: ListAffiliatesDto): Promise<PaginatedAffiliatesResult> {
    const filter: ListAffiliatesFilter = {
      page: dto.page,
      limit: dto.limit,
      status: dto.status,
      search: dto.search,
    }

    const [data, total] = await Promise.all([
      this.affiliates.list(filter),
      this.affiliates.count(filter),
    ])

    return { data, total, page: dto.page, limit: dto.limit }
  }
}
