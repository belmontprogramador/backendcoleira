import type { NfcTag } from '../entities/nfc-tag.entity'

/**
 * Porta do repositório de tags NFC.
 */
export interface NfcTagRepositoryPort {
  findById(id: string): Promise<NfcTag | null>
  findByPublicId(publicId: string): Promise<NfcTag | null>
  findByUid(uid: string): Promise<NfcTag | null>
  findNextToWrite(batchId?: string): Promise<NfcTag | null>
  listByBatch(batchId: string): Promise<NfcTag[]>
  listByPet(petId: string): Promise<NfcTag[]>
  /** Tags não ativadas (AVAILABLE/DELIVERED, sem dono) — para ativação por código. */
  listUnactivated(): Promise<NfcTag[]>
  list(filter: {
    status?: string
    batchId?: string
    page: number
    limit: number
  }): Promise<NfcTag[]>
  count(filter: { status?: string; batchId?: string }): Promise<number>
  save(tag: NfcTag): Promise<void>
  saveMany(tags: NfcTag[]): Promise<void>
}

export const NFC_TAG_REPOSITORY_PORT = Symbol('NFC_TAG_REPOSITORY_PORT')
