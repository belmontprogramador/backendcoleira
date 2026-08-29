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

/**
 * Caso de uso: listar tags (por batch/status).
 */
@Injectable()
export class ListTagsUseCase {
  constructor(
    @Inject(NFC_TAG_REPOSITORY_PORT)
    private readonly tags: NfcTagRepositoryPort,
  ) {}

  async execute(filter: ListTagsFilter): Promise<NfcTag[]> {
    if (filter.batchId && !filter.status) {
      return this.tags.listByBatch(filter.batchId)
    }
    return this.tags.list({
      status: filter.status,
      batchId: filter.batchId,
      page: filter.page ?? 1,
      limit: filter.limit ?? 20,
    })
  }
}
