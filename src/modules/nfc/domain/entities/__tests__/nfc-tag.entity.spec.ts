import {
  NfcTag,
  InvalidTagStatusTransitionError,
  TagAlreadyActivatedError,
  TagNotActiveError,
  TagStatus,
} from '../nfc-tag.entity'
import { PublicId } from '../../value-objects/public-id.vo'
import { Uid } from '../../value-objects/uid.vo'

describe('NfcTag (agregado)', () => {
  function makeTag(publicId = '7F4K9M2Q'): NfcTag {
    return NfcTag.create({
      id: 'tag-1',
      publicId: PublicId.create(publicId),
      activationCodeEncrypted: 'encrypted-code',
      batchId: 'batch-1',
    })
  }

  it('cria uma tag no estado CREATED', () => {
    const tag = makeTag()
    expect(tag.status).toBe(TagStatus.CREATED)
    expect(tag.publicId.value).toBe('7F4K9M2Q')
    expect(tag.uid).toBeNull()
    expect(tag.ownerId).toBeNull()
    expect(tag.petId).toBeNull()
  })

  it('percorre o fluxo normal: CREATED → READY → IN_STOCK → SOLD → DELIVERED', () => {
    const tag = makeTag()

    tag.markWritten(Uid.create('04:A7:32:91:8B:1F'))
    expect(tag.status).toBe(TagStatus.READY)
    expect(tag.uid?.value).toBe('04:A7:32:91:8B:1F')

    tag.markInStock()
    expect(tag.status).toBe(TagStatus.IN_STOCK)

    tag.markSold()
    expect(tag.status).toBe(TagStatus.SOLD)

    tag.markDelivered()
    expect(tag.status).toBe(TagStatus.DELIVERED)
  })

  it('rejeita transição inválida (ex.: CREATED → SOLD direto)', () => {
    const tag = makeTag()
    expect(() => tag.markSold()).toThrow(InvalidTagStatusTransitionError)
  })

  it('regrava tag READY de forma idempotente (READY → READY, atualiza uid)', () => {
    const tag = makeTag()
    tag.markWritten(Uid.create('04:A7:32:91:8B:1F'))
    tag.markWritten(Uid.create('04:A7:32:91:8B:2E'))

    expect(tag.status).toBe(TagStatus.READY)
    expect(tag.uid?.value).toBe('04:A7:32:91:8B:2E')
  })

  it('transições da Fase 4/5 (AVAILABLE/ACTIVE/SUSPENDED/LOST/DEACTIVATED/RETIRED) são permitidas após DELIVERED', () => {
    const tag = makeTag()
    tag.markWritten(Uid.create('04:A7:32:91:8B:1F'))
    tag.markInStock()
    tag.markSold()
    tag.markDelivered()

    tag.markAvailable()
    expect(tag.status).toBe(TagStatus.AVAILABLE)
  })

  it('reconstitui a partir de dados persistidos', () => {
    const tag = NfcTag.reconstitute({
      id: 'tag-1',
      publicId: PublicId.create('7F4K9M2Q'),
      uid: Uid.create('04:A7:32:91:8B:1F'),
      activationCodeEncrypted: 'encrypted-code',
      status: TagStatus.READY,
      batchId: 'batch-1',
      ownerId: null,
      petId: null,
      activatedAt: null,
      deactivatedAt: null,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    })

    expect(tag.id).toBe('tag-1')
    expect(tag.status).toBe(TagStatus.READY)
    expect(tag.uid?.value).toBe('04:A7:32:91:8B:1F')
  })

  describe('reset()', () => {
    it('reset: READY → CREATED, limpa uid, mantém publicId + código', () => {
      const tag = makeTag()
      tag.markWritten(Uid.create('04:A7:32:91:8B:1F'))
      tag.reset()

      expect(tag.status).toBe(TagStatus.CREATED)
      expect(tag.uid).toBeNull()
      expect(tag.publicId.value).toBe('7F4K9M2Q')
      expect(tag.activationCodeEncrypted).toBe('encrypted-code')
    })

    it('reset é idempotente (CREATED sem dados → no-op)', () => {
      const tag = makeTag()
      expect(() => tag.reset()).not.toThrow()
      expect(tag.status).toBe(TagStatus.CREATED)
    })

    it('reset aceita QUALQUER estado (IN_STOCK → CREATED)', () => {
      const tag = makeTag()
      tag.markWritten(Uid.create('04:A7:32:91:8B:1F'))
      tag.markInStock()
      tag.reset()

      expect(tag.status).toBe(TagStatus.CREATED)
    })

    it('reset virgem total limpa uid/owner/pet/ativação (ACTIVE → CREATED)', () => {
      const tag = makeTag()
      tag.markWritten(Uid.create('04:A7:32:91:8B:1F'))
      tag.markInStock()
      tag.markSold()
      tag.markDelivered()
      tag.markAvailable()
      tag.activate('user-1')
      tag.associatePet('pet-1')

      tag.reset()

      expect(tag.status).toBe(TagStatus.CREATED)
      expect(tag.uid).toBeNull()
      expect(tag.ownerId).toBeNull()
      expect(tag.petId).toBeNull()
      expect(tag.activatedAt).toBeNull()
      expect(tag.publicId.value).toBe('7F4K9M2Q')
      expect(tag.activationCodeEncrypted).toBe('encrypted-code')
    })
  })

  describe('markWrittenWithoutUid()', () => {
    it('CREATED → READY sem uid', () => {
      const tag = makeTag()
      tag.markWrittenWithoutUid()

      expect(tag.status).toBe(TagStatus.READY)
      expect(tag.uid).toBeNull()
    })

    it('READY → READY idempotente (sem uid)', () => {
      const tag = makeTag()
      tag.markWrittenWithoutUid()
      tag.markWrittenWithoutUid()

      expect(tag.status).toBe(TagStatus.READY)
      expect(tag.uid).toBeNull()
    })
  })
})

describe('NfcTag — ativação e ownership (Fase 4.1)', () => {
  function deliveredTag(): NfcTag {
    const tag = NfcTag.create({
      id: 'tag-1',
      publicId: PublicId.create('7F4K9M2Q'),
      activationCodeEncrypted: 'encrypted-code',
      batchId: 'batch-1',
    })
    tag.markWritten(Uid.create('04:A7:32:91:8B:1F'))
    tag.markInStock()
    tag.markSold()
    tag.markDelivered()
    return tag
  }

  function availableTag(): NfcTag {
    const tag = deliveredTag()
    tag.markAvailable()
    return tag
  }

  function activeTag(): NfcTag {
    const tag = availableTag()
    tag.activate('user-1')
    return tag
  }

  describe('activate()', () => {
    it('ativa uma tag DELIVERED (transição automática DELIVERED → ACTIVE)', () => {
      const tag = deliveredTag()
      tag.activate('user-1')

      expect(tag.status).toBe(TagStatus.ACTIVE)
      expect(tag.ownerId).toBe('user-1')
      expect(tag.activatedAt).not.toBeNull()
    })

    it('ativa uma tag AVAILABLE', () => {
      const tag = availableTag()
      tag.activate('user-1')

      expect(tag.status).toBe(TagStatus.ACTIVE)
      expect(tag.ownerId).toBe('user-1')
    })

    it('rejeita ativar tag já ativada (owner não nulo)', () => {
      const tag = activeTag()
      expect(() => tag.activate('user-2')).toThrow(TagAlreadyActivatedError)
    })

    it('rejeita ativar tag em estado inválido (CREATED)', () => {
      const tag = NfcTag.create({
        id: 'tag-1',
        publicId: PublicId.create('7F4K9M2Q'),
        activationCodeEncrypted: 'encrypted-code',
      })
      expect(() => tag.activate('user-1')).toThrow(
        InvalidTagStatusTransitionError,
      )
    })
  })

  describe('associatePet() / disassociatePet()', () => {
    it('associa um pet a uma tag ACTIVE', () => {
      const tag = activeTag()
      tag.associatePet('pet-1')

      expect(tag.petId).toBe('pet-1')
    })

    it('desassocia o pet', () => {
      const tag = activeTag()
      tag.associatePet('pet-1')
      tag.disassociatePet()

      expect(tag.petId).toBeNull()
    })

    it('rejeita associar pet a tag não ativa', () => {
      const tag = availableTag()
      expect(() => tag.associatePet('pet-1')).toThrow(TagNotActiveError)
    })
  })

  describe('unlink()', () => {
    it('desvincula: ACTIVE → AVAILABLE, limpa owner/pet', () => {
      const tag = activeTag()
      tag.associatePet('pet-1')
      tag.unlink()

      expect(tag.status).toBe(TagStatus.AVAILABLE)
      expect(tag.ownerId).toBeNull()
      expect(tag.petId).toBeNull()
    })

    it('rejeita desvincular tag não ativa', () => {
      const tag = availableTag()
      expect(() => tag.unlink()).toThrow(TagNotActiveError)
    })
  })

  describe('retire()', () => {
    it('aposenta: ACTIVE → RETIRED, limpa owner/pet', () => {
      const tag = activeTag()
      tag.associatePet('pet-1')
      tag.retire()

      expect(tag.status).toBe(TagStatus.RETIRED)
      expect(tag.ownerId).toBeNull()
      expect(tag.petId).toBeNull()
    })
  })
})
