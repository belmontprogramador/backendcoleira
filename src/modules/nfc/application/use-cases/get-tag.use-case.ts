import { Inject, Injectable } from '@nestjs/common'
import { NFC_TAG_REPOSITORY_PORT } from '../../domain/repositories/nfc-tag.repository.port'
import type { NfcTagRepositoryPort } from '../../domain/repositories/nfc-tag.repository.port'
import type { NfcTag } from '../../domain/entities/nfc-tag.entity'
import { TagNotFoundError } from '../errors'

/**
 * Caso de uso: detalhar uma tag pelo publicId.
 */
@Injectable()
export class GetTagUseCase {
  constructor(
    @Inject(NFC_TAG_REPOSITORY_PORT)
    private readonly tags: NfcTagRepositoryPort,
  ) {}

  async execute(publicId: string): Promise<NfcTag> {
    const tag = await this.tags.findByPublicId(publicId)
    if (!tag) {
      throw new TagNotFoundError(publicId)
    }
    return tag
  }
}
