import { Inject, Injectable } from '@nestjs/common'
import { NFC_TAG_REPOSITORY_PORT } from '../../domain/repositories/nfc-tag.repository.port'
import type { NfcTagRepositoryPort } from '../../domain/repositories/nfc-tag.repository.port'
import { PUBLIC_BASE_URL_PORT } from '../../domain/services/public-base-url.port'
import type { PublicBaseUrlPort } from '../../domain/services/public-base-url.port'

export interface NextTagToWrite {
  publicId: string
  url: string
}

/**
 * Caso de uso: próxima tag CREATED + URL para o modo celular (Web NFC).
 * O front grava a URL no chip e reporta via `ReportNfcWriteUseCase`.
 * Permissão `tag:record` (OPERATOR) na rota.
 */
@Injectable()
export class GetNextTagToWriteUseCase {
  constructor(
    @Inject(NFC_TAG_REPOSITORY_PORT)
    private readonly tags: NfcTagRepositoryPort,
    @Inject(PUBLIC_BASE_URL_PORT)
    private readonly baseUrl: PublicBaseUrlPort,
  ) {}

  async execute(batchId?: string): Promise<NextTagToWrite | null> {
    const tag = await this.tags.findNextToWrite(batchId)
    if (!tag) {
      return null
    }
    return {
      publicId: tag.publicId.value,
      url: this.baseUrl.buildProfileUrl(tag.publicId.value),
    }
  }
}
