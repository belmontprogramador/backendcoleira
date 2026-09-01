import { Inject, Injectable } from '@nestjs/common'
import { NFC_TAG_REPOSITORY_PORT } from '../../domain/repositories/nfc-tag.repository.port'
import type { NfcTagRepositoryPort } from '../../domain/repositories/nfc-tag.repository.port'
import type { NfcTag } from '../../domain/entities/nfc-tag.entity'

export interface ListTagsFilter {
  batchId?: string
  status?: string
  page?: number
  limit?: number
}

export interface PaginatedTagsResult {
  data: NfcTag[]
  total: number
  page: number
  limit: number
}

/**
 * Caso de uso: listar tags (por batch/status) com paginação real
 * (`data` + `total`). O controller monta o envelope `{ data, meta }`.
 */
@Injectable()
export class ListTagsUseCase {
  constructor(
    @Inject(NFC_TAG_REPOSITORY_PORT)
    private readonly tags: NfcTagRepositoryPort,
  ) {}

  async execute(filter: ListTagsFilter): Promise<PaginatedTagsResult> {
    const page = filter.page ?? 1
    const limit = filter.limit ?? 20
    const [data, total] = await Promise.all([
      this.tags.list({
        status: filter.status,
        batchId: filter.batchId,
        page,
        limit,
      }),
      this.tags.count({
        status: filter.status,
        batchId: filter.batchId,
      }),
    ])
    return { data, total, page, limit }
  }
}
