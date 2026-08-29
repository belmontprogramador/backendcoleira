import { TagOwnership } from '../tag-ownership.policy'
import { TagNotOwnedError } from '../../errors'
import {
  NfcTag,
  TagStatus,
} from '../../../../nfc/domain/entities/nfc-tag.entity'
import { PublicId } from '../../../../nfc/domain/value-objects/public-id.vo'

describe('TagOwnership (policy anti-IDOR)', () => {
  function activeTag(ownerId: string | null): NfcTag {
    return NfcTag.reconstitute({
      id: 'tag-1',
      publicId: PublicId.create('7F4K9M2Q'),
      uid: null,
      activationCodeEncrypted: 'encrypted',
      status: TagStatus.ACTIVE,
      batchId: null,
      ownerId,
      petId: null,
      activatedAt: new Date(),
      deactivatedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  it('não lança quando o ator é o dono do pingente', () => {
    expect(() => TagOwnership.assertOwner(activeTag('u1'), 'u1')).not.toThrow()
  })

  it('lança TagNotOwnedError quando o ator não é o dono', () => {
    expect(() => TagOwnership.assertOwner(activeTag('u1'), 'u2')).toThrow(
      TagNotOwnedError,
    )
  })
})
