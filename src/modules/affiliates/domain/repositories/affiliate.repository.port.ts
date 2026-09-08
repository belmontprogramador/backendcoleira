import type { Affiliate } from '../entities/affiliate.entity'
import type { AffiliateStatus } from '../value-objects/affiliate-status.vo'

export interface ListAffiliatesFilter {
  status?: AffiliateStatus
  search?: string
  page: number
  limit: number
}

/**
 * Porta do repositório de afiliados. DIP: domínio/aplicação dependem desta
 * interface; a implementação (Prisma) vive na infraestrutura.
 */
export interface AffiliateRepositoryPort {
  save(affiliate: Affiliate): Promise<Affiliate>
  findById(id: string): Promise<Affiliate | null>
  findByUserId(userId: string): Promise<Affiliate | null>
  findByCode(code: string): Promise<Affiliate | null>
  findByEmail(email: string): Promise<Affiliate | null>
  list(filter: ListAffiliatesFilter): Promise<Affiliate[]>
  count(filter: ListAffiliatesFilter): Promise<number>
}

export const AFFILIATE_REPOSITORY_PORT = Symbol('AFFILIATE_REPOSITORY_PORT')
