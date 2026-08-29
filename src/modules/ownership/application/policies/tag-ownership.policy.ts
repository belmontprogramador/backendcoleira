import type { NfcTag } from '../../../nfc/domain/entities/nfc-tag.entity'
import { TagNotOwnedError } from '../errors'

/**
 * Policy de ownership do pingente (anti-IDOR).
 *
 * Centraliza a regra "o ator deve ser o dono do pingente", repetida em ~5
 * use cases de ownership. Uma única fonte de verdade reduz o risco de um caso
 * de uso esquecer o check (vetor de IDOR).
 */
export class TagOwnership {
  static assertOwner(tag: NfcTag, userId: string): void {
    if (tag.ownerId !== userId) {
      throw new TagNotOwnedError()
    }
  }
}
