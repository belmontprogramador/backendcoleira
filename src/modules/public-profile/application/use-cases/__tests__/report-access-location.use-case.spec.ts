import { ReportAccessLocationUseCase } from '../report-access-location.use-case'
import { TagNotFoundError } from '../../../../nfc/application/errors'
import {
  AccessEventNotFoundError,
  AccessEventLocationInvalidError,
} from '../../../../access-events/application/errors'
import { AccessEvent } from '../../../../access-events/domain/entities/access-event.entity'
import { AccessSource } from '../../../../../common/constants/access-source'
import { ACCESS_HISTORY_FEATURE } from '../../../../../common/constants/features'
import type { NfcTagRepositoryPort } from '../../../../nfc/domain/repositories/nfc-tag.repository.port'
import type { AccessEventRepositoryPort } from '../../../../access-events/domain/repositories/access-event.repository.port'
import type { PetRepositoryPort } from '../../../../pets/domain/repositories/pet.repository.port'
import type { UserRepositoryPort } from '../../../../users/domain/repositories/user.repository.port'
import type { CachePort } from '../../../../../common/ports/cache.port'
import type { FeatureAccessPort } from '../../../../../common/ports/feature-access.port'
import type { EmailSenderPort } from '../../../../../common/ports/email-sender.port'
import type { WhatsAppSenderPort } from '../../../../../common/ports/whatsapp-sender.port'
import {
  NfcTag,
  TagStatus,
} from '../../../../nfc/domain/entities/nfc-tag.entity'
import { PublicId } from '../../../../nfc/domain/value-objects/public-id.vo'
import { Pet } from '../../../../pets/domain/entities/pet.entity'
import { PetSpecies } from '../../../../pets/domain/value-objects/pet-species.vo'
import { User } from '../../../../users/domain/entities/user.entity'
import { Email } from '../../../../users/domain/value-objects/email.vo'

describe('ReportAccessLocationUseCase', () => {
  let tags: jest.Mocked<NfcTagRepositoryPort>
  let events: jest.Mocked<AccessEventRepositoryPort>
  let pets: jest.Mocked<PetRepositoryPort>
  let users: jest.Mocked<UserRepositoryPort>
  let cache: jest.Mocked<CachePort>
  let featureAccess: jest.Mocked<FeatureAccessPort>
  let email: jest.Mocked<EmailSenderPort>
  let whatsapp: jest.Mocked<WhatsAppSenderPort>
  let useCase: ReportAccessLocationUseCase

  beforeEach(() => {
    jest.useFakeTimers()

    tags = {
      findById: jest.fn(),
      findByPublicId: jest.fn(),
      findByUid: jest.fn(),
      findNextToWrite: jest.fn(),
      listByBatch: jest.fn(),
      listByPet: jest.fn(),
      listUnactivated: jest.fn(),
      list: jest.fn(),
      count: jest.fn(),
      save: jest.fn(),
      saveMany: jest.fn(),
      deleteByBatch: jest.fn(),
    }
    events = {
      create: jest.fn(),
      findById: jest.fn(),
      updateLocation: jest.fn(),
      listByPet: jest.fn(),
    }
    pets = {
      findById: jest.fn(),
      listByOwner: jest.fn(),
      listAll: jest.fn(),
      save: jest.fn(),
    }
    users = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      save: jest.fn(),
      list: jest.fn(),
      count: jest.fn(),
    }
    cache = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      ping: jest.fn(),
      quit: jest.fn(),
    }
    featureAccess = { hasFeature: jest.fn(), listFeatures: jest.fn() }
    email = {
      sendVerificationEmail: jest.fn(),
      sendPasswordResetEmail: jest.fn(),
      sendAdminPasswordResetEmail: jest.fn(),
      sendTransferEmail: jest.fn(),
      sendContactMessageEmail: jest.fn(),
      sendScanAlertEmail: jest.fn(),
    }
    whatsapp = { sendContactMessage: jest.fn() }
    useCase = new ReportAccessLocationUseCase(
      tags,
      events,
      pets,
      users,
      cache,
      featureAccess,
      email,
      whatsapp,
    )
  })

  afterEach(() => {
    jest.clearAllTimers()
    jest.useRealTimers()
  })

  function makeTag(
    overrides: Partial<{ petId: string | null; ownerId: string | null }> = {},
  ): NfcTag {
    return NfcTag.reconstitute({
      id: 'tag-1',
      publicId: PublicId.create('7F4K9M2Q'),
      uid: null,
      activationCodeEncrypted: 'encrypted',
      status: TagStatus.ACTIVE,
      batchId: null,
      ownerId: overrides.ownerId ?? 'user-1',
      petId: overrides.petId ?? 'pet-1',
      activatedAt: null,
      deactivatedAt: null,
      resetAt: null,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    })
  }

  function makeEvent(
    overrides: Partial<{
      nfcTagId: string | null
      createdAt: Date
      locationApprox: string | null
      latitude: number | null
      longitude: number | null
    }> = {},
  ): AccessEvent {
    return AccessEvent.reconstitute({
      id: 'ev-1',
      petId: 'pet-1',
      nfcTagId: overrides.nfcTagId ?? 'tag-1',
      source: AccessSource.NFC,
      deviceType: null,
      ipHash: null,
      locationApprox: overrides.locationApprox ?? null,
      latitude: overrides.latitude ?? null,
      longitude: overrides.longitude ?? null,
      createdAt: overrides.createdAt ?? new Date(),
    })
  }

  function makePet(): Pet {
    return Pet.create({
      id: 'pet-1',
      ownerId: 'user-1',
      name: 'Thor',
      species: PetSpecies.create('Cão'),
      breed: 'Shih Tzu',
      sex: 'MALE',
      photoUrl: null,
      description: null,
      city: 'Araruama - RJ',
    })
  }

  function makeOwner(): User {
    return User.create({
      id: 'user-1',
      name: 'João Silva',
      email: Email.create('joao@example.com'),
      passwordHash: 'hash',
      phone: '(21) 99999-9999',
    })
  }

  it('lança TagNotFoundError quando o pingente não existe', async () => {
    tags.findByPublicId.mockResolvedValue(null)

    await expect(
      useCase.execute({
        publicId: '7F4K9M2Q',
        accessId: 'ev-1',
        latitude: -22.9,
        longitude: -43.1,
      }),
    ).rejects.toThrow(TagNotFoundError)
    expect(events.updateLocation).not.toHaveBeenCalled()
  })

  it('lança AccessEventNotFoundError quando o acesso não existe', async () => {
    tags.findByPublicId.mockResolvedValue(makeTag())
    events.findById.mockResolvedValue(null)

    await expect(
      useCase.execute({
        publicId: '7F4K9M2Q',
        accessId: 'ev-1',
        latitude: -22.9,
        longitude: -43.1,
      }),
    ).rejects.toThrow(AccessEventNotFoundError)
    expect(events.updateLocation).not.toHaveBeenCalled()
  })

  it('lança AccessEventLocationInvalidError quando o evento é de outro pingente', async () => {
    tags.findByPublicId.mockResolvedValue(makeTag())
    events.findById.mockResolvedValue(makeEvent({ nfcTagId: 'other-tag' }))

    await expect(
      useCase.execute({
        publicId: '7F4K9M2Q',
        accessId: 'ev-1',
        latitude: -22.9,
        longitude: -43.1,
      }),
    ).rejects.toThrow(AccessEventLocationInvalidError)
    expect(events.updateLocation).not.toHaveBeenCalled()
  })

  it('lança AccessEventLocationInvalidError quando o evento é antigo', async () => {
    tags.findByPublicId.mockResolvedValue(makeTag())
    events.findById.mockResolvedValue(
      makeEvent({ createdAt: new Date(Date.now() - 16 * 60 * 1000) }),
    )

    await expect(
      useCase.execute({
        publicId: '7F4K9M2Q',
        accessId: 'ev-1',
        latitude: -22.9,
        longitude: -43.1,
      }),
    ).rejects.toThrow(AccessEventLocationInvalidError)
    expect(events.updateLocation).not.toHaveBeenCalled()
  })

  it('atualiza as coordenadas quando o GPS é reportado', async () => {
    tags.findByPublicId.mockResolvedValue(makeTag())
    events.findById.mockResolvedValue(makeEvent())

    await useCase.execute({
      publicId: '7F4K9M2Q',
      accessId: 'ev-1',
      latitude: -22.9068,
      longitude: -43.1729,
    })

    expect(events.updateLocation).toHaveBeenCalledWith(
      'ev-1',
      -22.9068,
      -43.1729,
    )
  })

  it('não atualiza quando a permissão foi negada (sem coords)', async () => {
    tags.findByPublicId.mockResolvedValue(makeTag())
    events.findById.mockResolvedValue(makeEvent())

    await useCase.execute({
      publicId: '7F4K9M2Q',
      accessId: 'ev-1',
      latitude: null,
      longitude: null,
    })

    expect(events.updateLocation).not.toHaveBeenCalled()
  })

  describe('alerta de acesso por e-mail (doc-sistema §11, ~30s após o scan)', () => {
    it('envia e-mail ao tutor com GPS depois de 30s', async () => {
      tags.findByPublicId.mockResolvedValue(makeTag())
      events.findById
        .mockResolvedValueOnce(makeEvent())
        .mockResolvedValue(
          makeEvent({ latitude: -22.9068, longitude: -43.1729 }),
        )
      pets.findById.mockResolvedValue(makePet())
      users.findById.mockResolvedValue(makeOwner())
      featureAccess.hasFeature.mockResolvedValue(true)

      await useCase.execute({
        publicId: '7F4K9M2Q',
        accessId: 'ev-1',
        latitude: -22.9068,
        longitude: -43.1729,
      })

      // Ainda não enviou (aguardando o visitante aceitar a permissão).
      expect(email.sendScanAlertEmail).not.toHaveBeenCalled()

      await jest.advanceTimersByTimeAsync(30000)

      expect(email.sendScanAlertEmail).toHaveBeenCalledWith(
        'joao@example.com',
        {
          petName: 'Thor',
          source: AccessSource.NFC,
          latitude: -22.9068,
          longitude: -43.1729,
        },
      )
      expect(whatsapp.sendContactMessage).toHaveBeenCalledWith(
        '(21) 99999-9999',
        expect.stringContaining('🐾 Thor foi visto'),
      )
    })

    it('usa coords null (não rastreada) quando a permissão foi negada', async () => {
      tags.findByPublicId.mockResolvedValue(makeTag())
      events.findById.mockResolvedValue(makeEvent())
      pets.findById.mockResolvedValue(makePet())
      users.findById.mockResolvedValue(makeOwner())
      featureAccess.hasFeature.mockResolvedValue(true)

      await useCase.execute({
        publicId: '7F4K9M2Q',
        accessId: 'ev-1',
        latitude: null,
        longitude: null,
      })

      await jest.advanceTimersByTimeAsync(30000)

      expect(email.sendScanAlertEmail).toHaveBeenCalledWith(
        'joao@example.com',
        {
          petName: 'Thor',
          source: AccessSource.NFC,
          latitude: null,
          longitude: null,
        },
      )
    })

    it('dispara o e-mail mesmo quando o pet NÃO está perdido', async () => {
      tags.findByPublicId.mockResolvedValue(makeTag())
      events.findById.mockResolvedValue(makeEvent())
      pets.findById.mockResolvedValue(makePet()) // lostStatus = false
      users.findById.mockResolvedValue(makeOwner())
      featureAccess.hasFeature.mockResolvedValue(true)

      await useCase.execute({
        publicId: '7F4K9M2Q',
        accessId: 'ev-1',
        latitude: -22.9,
        longitude: -43.1,
      })

      await jest.advanceTimersByTimeAsync(30000)

      expect(email.sendScanAlertEmail).toHaveBeenCalled()
    })

    it('não envia quando o dono não tem ACCESS_HISTORY (não premium)', async () => {
      tags.findByPublicId.mockResolvedValue(makeTag())
      events.findById.mockResolvedValue(makeEvent())
      pets.findById.mockResolvedValue(makePet())
      users.findById.mockResolvedValue(makeOwner())
      featureAccess.hasFeature.mockResolvedValue(false)

      await useCase.execute({
        publicId: '7F4K9M2Q',
        accessId: 'ev-1',
        latitude: -22.9,
        longitude: -43.1,
      })

      await jest.advanceTimersByTimeAsync(30000)

      expect(email.sendScanAlertEmail).not.toHaveBeenCalled()
    })

    it('não repete o e-mail dentro da janela de throttle', async () => {
      tags.findByPublicId.mockResolvedValue(makeTag())
      events.findById.mockResolvedValue(makeEvent())
      pets.findById.mockResolvedValue(makePet())
      users.findById.mockResolvedValue(makeOwner())
      featureAccess.hasFeature.mockResolvedValue(true)
      cache.get.mockImplementation(async (key) =>
        key.startsWith('scan-alert:') ? '1' : null,
      )

      await useCase.execute({
        publicId: '7F4K9M2Q',
        accessId: 'ev-1',
        latitude: -22.9,
        longitude: -43.1,
      })

      await jest.advanceTimersByTimeAsync(30000)

      expect(email.sendScanAlertEmail).not.toHaveBeenCalled()
    })

    it('não envia quando o pet foi soft-deletado', async () => {
      const pet = makePet()
      pet.deactivate()
      tags.findByPublicId.mockResolvedValue(makeTag())
      events.findById.mockResolvedValue(makeEvent())
      pets.findById.mockResolvedValue(pet)
      users.findById.mockResolvedValue(makeOwner())
      featureAccess.hasFeature.mockResolvedValue(true)

      await useCase.execute({
        publicId: '7F4K9M2Q',
        accessId: 'ev-1',
        latitude: -22.9,
        longitude: -43.1,
      })

      await jest.advanceTimersByTimeAsync(30000)

      expect(email.sendScanAlertEmail).not.toHaveBeenCalled()
    })

    it('não envia quando o pingente não tem pet (virgem)', async () => {
      tags.findByPublicId.mockResolvedValue(
        makeTag({ petId: null, ownerId: null }),
      )
      events.findById.mockResolvedValue(makeEvent())

      await useCase.execute({
        publicId: '7F4K9M2Q',
        accessId: 'ev-1',
        latitude: -22.9,
        longitude: -43.1,
      })

      await jest.advanceTimersByTimeAsync(30000)

      expect(email.sendScanAlertEmail).not.toHaveBeenCalled()
    })

    it('não derruba o report quando o envio do e-mail falha', async () => {
      tags.findByPublicId.mockResolvedValue(makeTag())
      events.findById.mockResolvedValue(makeEvent())
      pets.findById.mockResolvedValue(makePet())
      users.findById.mockResolvedValue(makeOwner())
      featureAccess.hasFeature.mockResolvedValue(true)
      email.sendScanAlertEmail.mockRejectedValue(new Error('smtp down'))

      await expect(
        useCase.execute({
          publicId: '7F4K9M2Q',
          accessId: 'ev-1',
          latitude: -22.9,
          longitude: -43.1,
        }),
      ).resolves.toBeUndefined()

      await jest.advanceTimersByTimeAsync(30000)

      expect(events.updateLocation).toHaveBeenCalled()
    })
  })
})
