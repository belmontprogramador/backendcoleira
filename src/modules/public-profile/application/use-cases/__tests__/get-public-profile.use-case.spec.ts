import { GetPublicProfileUseCase } from '../get-public-profile.use-case'
import { PublicProfile } from '../../../domain/value-objects/public-profile.vo'
import { TagNotFoundError } from '../../../../nfc/application/errors'
import { PetNotFoundError } from '../../../../pets/application/errors'
import { UserNotFoundError } from '../../../../users/application/errors'
import { AccessSource } from '../../../../../common/constants/access-source'
import { CONTACT_MESSAGES_FEATURE } from '../../../../../common/constants/features'
import type { NfcTagRepositoryPort } from '../../../../nfc/domain/repositories/nfc-tag.repository.port'
import type { PetRepositoryPort } from '../../../../pets/domain/repositories/pet.repository.port'
import type { UserRepositoryPort } from '../../../../users/domain/repositories/user.repository.port'
import type { CachePort } from '../../../../../common/ports/cache.port'
import type { FeatureAccessPort } from '../../../../../common/ports/feature-access.port'
import type { IpGeolocationPort } from '../../../../../common/ports/ip-geolocation.port'
import type { RegisterAccessEventUseCase } from '../../../../access-events/application/use-cases/register-access-event.use-case'
import {
  profileCacheKey,
  PROFILE_CACHE_TTL_SECONDS,
  PROFILE_CACHE_TTL_LOST_SECONDS,
} from '../../../../../common/constants/profile-cache'
import {
  NfcTag,
  TagStatus,
} from '../../../../nfc/domain/entities/nfc-tag.entity'
import { PublicId } from '../../../../nfc/domain/value-objects/public-id.vo'
import { Pet } from '../../../../pets/domain/entities/pet.entity'
import { PetSpecies } from '../../../../pets/domain/value-objects/pet-species.vo'
import { User } from '../../../../users/domain/entities/user.entity'
import { Email } from '../../../../users/domain/value-objects/email.vo'

describe('GetPublicProfileUseCase', () => {
  let tags: jest.Mocked<NfcTagRepositoryPort>
  let pets: jest.Mocked<PetRepositoryPort>
  let users: jest.Mocked<UserRepositoryPort>
  let cache: jest.Mocked<CachePort>
  let featureAccess: jest.Mocked<FeatureAccessPort>
  let geolocation: jest.Mocked<IpGeolocationPort>
  let registerAccessEvent: jest.Mocked<RegisterAccessEventUseCase>
  let useCase: GetPublicProfileUseCase

  beforeEach(() => {
    tags = {
      findById: jest.fn(),
      findByPublicId: jest.fn(),
      findByUid: jest.fn(),
      findNextToWrite: jest.fn(),
      listByBatch: jest.fn(),
      listByPet: jest.fn(),

      listUnactivated: jest.fn(),
      list: jest.fn(),
      save: jest.fn(),
      saveMany: jest.fn(),
      deleteByBatch: jest.fn(),
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
    geolocation = { resolve: jest.fn() }
    registerAccessEvent = {
      execute: jest.fn(),
    } as jest.Mocked<RegisterAccessEventUseCase>
    cache.get.mockResolvedValue(null)
    featureAccess.hasFeature.mockResolvedValue(false)
    geolocation.resolve.mockResolvedValue('São Paulo, SP, Brazil')
    useCase = new GetPublicProfileUseCase(
      tags,
      pets,
      users,
      cache,
      featureAccess,
      geolocation,
      registerAccessEvent,
    )
  })

  function makeTag(petId: string | null = 'pet-1'): NfcTag {
    return NfcTag.reconstitute({
      id: 'tag-1',
      publicId: PublicId.create('7F4K9M2Q'),
      uid: null,
      activationCodeEncrypted: 'encrypted',
      status: TagStatus.ACTIVE,
      batchId: null,
      ownerId: 'user-1',
      petId,
      activatedAt: null,
      deactivatedAt: null,
      resetAt: null,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
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
      photoUrl: 'https://storage.example.com/pets/thor.jpg',
      description: 'Muito carinhoso',
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

  it('lança TagNotFoundError quando a tag não existe', async () => {
    tags.findByPublicId.mockResolvedValue(null)

    await expect(useCase.execute({ publicId: '7F4K9M2Q' })).rejects.toThrow(
      TagNotFoundError,
    )
    expect(registerAccessEvent.execute).not.toHaveBeenCalled()
    expect(cache.set).not.toHaveBeenCalled()
  })

  it('retorna perfil não ativado quando a tag não tem pet', async () => {
    const tag = makeTag(null)
    tags.findByPublicId.mockResolvedValue(tag)

    const result = await useCase.execute({ publicId: '7F4K9M2Q' })

    expect(result.profile.isActive).toBe(false)
    expect(result.profile.kind).toBe('UNAVAILABLE')
    expect(result.profile.pet).toBeNull()
    expect(result.profile.owner).toBeNull()
    expect(result.profile.message).toBe('Este pingente ainda não foi ativado')
    expect(result.contactEnabled).toBe(false)
    expect(pets.findById).not.toHaveBeenCalled()
    expect(registerAccessEvent.execute).toHaveBeenCalledWith(
      expect.objectContaining({ petId: null, nfcTagId: 'tag-1' }),
    )
  })

  it('retorna perfil não ativado quando o pet foi soft-deletado', async () => {
    const tag = makeTag('pet-1')
    const pet = makePet()
    pet.deactivate()
    tags.findByPublicId.mockResolvedValue(tag)
    pets.findById.mockResolvedValue(pet)

    const result = await useCase.execute({ publicId: '7F4K9M2Q' })

    expect(result.profile.isActive).toBe(false)
    expect(result.profile.pet).toBeNull()
    expect(users.findById).not.toHaveBeenCalled()
  })

  it('lança PetNotFoundError quando o pet referenciado não existe', async () => {
    const tag = makeTag('pet-1')
    tags.findByPublicId.mockResolvedValue(tag)
    pets.findById.mockResolvedValue(null)

    await expect(useCase.execute({ publicId: '7F4K9M2Q' })).rejects.toThrow(
      PetNotFoundError,
    )
    expect(cache.set).not.toHaveBeenCalled()
  })

  it('lança UserNotFoundError quando o tutor não existe', async () => {
    const tag = makeTag('pet-1')
    const pet = makePet()
    tags.findByPublicId.mockResolvedValue(tag)
    pets.findById.mockResolvedValue(pet)
    users.findById.mockResolvedValue(null)

    await expect(useCase.execute({ publicId: '7F4K9M2Q' })).rejects.toThrow(
      UserNotFoundError,
    )
    expect(cache.set).not.toHaveBeenCalled()
  })

  it('retorna o perfil público ativo com privacidade aplicada', async () => {
    const tag = makeTag('pet-1')
    const pet = makePet()
    const owner = makeOwner()
    tags.findByPublicId.mockResolvedValue(tag)
    pets.findById.mockResolvedValue(pet)
    users.findById.mockResolvedValue(owner)

    const result = await useCase.execute({ publicId: '7F4K9M2Q' })

    expect(result.profile.isActive).toBe(true)
    expect(result.profile.kind).toBe('ACTIVE')
    expect(result.profile.pet?.name).toBe('Thor')
    expect(result.profile.pet?.species).toBe('Cão')
    expect(result.profile.owner?.name).toBe('João Silva')
    expect(result.profile.owner?.phone).toBe('(21) 99999-9999')
    // show_email default = true → email exposto (contato direto no Basic)
    expect(result.profile.owner?.email).toBe('joao@example.com')
    expect(result.contactEnabled).toBe(false)
    expect(tags.findByPublicId).toHaveBeenCalledWith('7F4K9M2Q')
    expect(pets.findById).toHaveBeenCalledWith('pet-1')
    expect(users.findById).toHaveBeenCalledWith('user-1')
  })

  it('habilita contato (contactEnabled=true) quando o dono tem a feature', async () => {
    const tag = makeTag('pet-1')
    const pet = makePet()
    const owner = makeOwner()
    tags.findByPublicId.mockResolvedValue(tag)
    pets.findById.mockResolvedValue(pet)
    users.findById.mockResolvedValue(owner)
    featureAccess.hasFeature.mockResolvedValue(true)

    const result = await useCase.execute({ publicId: '7F4K9M2Q' })

    expect(result.contactEnabled).toBe(true)
    expect(featureAccess.hasFeature).toHaveBeenCalledWith(
      'user-1',
      CONTACT_MESSAGES_FEATURE,
    )
  })

  describe('side-effect de registro de acesso', () => {
    it('registra o acesso com source, ip, device e localização', async () => {
      const tag = makeTag('pet-1')
      const pet = makePet()
      const owner = makeOwner()
      tags.findByPublicId.mockResolvedValue(tag)
      pets.findById.mockResolvedValue(pet)
      users.findById.mockResolvedValue(owner)

      await useCase.execute({
        publicId: '7F4K9M2Q',
        source: AccessSource.QR,
        ip: '187.22.1.1',
        ipHash: 'ip-hash',
        deviceType: 'iPhone',
      })

      expect(registerAccessEvent.execute).toHaveBeenCalledWith({
        petId: 'pet-1',
        nfcTagId: 'tag-1',
        source: AccessSource.QR,
        ipHash: 'ip-hash',
        deviceType: 'iPhone',
        locationApprox: 'São Paulo, SP, Brazil',
      })
      expect(geolocation.resolve).toHaveBeenCalledWith('187.22.1.1')
    })

    it('não derruba o perfil quando o registro de acesso falha (RNF10)', async () => {
      const tag = makeTag('pet-1')
      const pet = makePet()
      const owner = makeOwner()
      tags.findByPublicId.mockResolvedValue(tag)
      pets.findById.mockResolvedValue(pet)
      users.findById.mockResolvedValue(owner)
      registerAccessEvent.execute.mockRejectedValue(new Error('db down'))

      const result = await useCase.execute({ publicId: '7F4K9M2Q' })

      expect(result.profile.isActive).toBe(true)
      expect(result.profile.pet?.name).toBe('Thor')
    })
  })

  describe('cache', () => {
    it('retorna do cache sem tocar em pets/users (mas registra acesso)', async () => {
      const tag = makeTag('pet-1')
      tags.findByPublicId.mockResolvedValue(tag)
      const profile = PublicProfile.active(makePet(), makeOwner())
      cache.get.mockResolvedValue(JSON.stringify(profile.toJSON()))

      const result = await useCase.execute({ publicId: '7F4K9M2Q' })

      expect(result.profile.isActive).toBe(true)
      expect(result.profile.pet?.name).toBe('Thor')
      expect(tags.findByPublicId).toHaveBeenCalled()
      expect(registerAccessEvent.execute).toHaveBeenCalled()
      expect(pets.findById).not.toHaveBeenCalled()
      expect(users.findById).not.toHaveBeenCalled()
    })

    it('popula o cache (TTL 300s) no miss', async () => {
      const tag = makeTag('pet-1')
      const pet = makePet()
      const owner = makeOwner()
      tags.findByPublicId.mockResolvedValue(tag)
      pets.findById.mockResolvedValue(pet)
      users.findById.mockResolvedValue(owner)

      await useCase.execute({ publicId: '7F4K9M2Q' })

      expect(cache.set).toHaveBeenCalledWith(
        profileCacheKey('7F4K9M2Q'),
        expect.any(String),
        PROFILE_CACHE_TTL_SECONDS,
      )
    })

    it('usa TTL reduzido (60s) quando o pet está perdido', async () => {
      const tag = makeTag('pet-1')
      const pet = makePet()
      pet.markLost()
      const owner = makeOwner()
      tags.findByPublicId.mockResolvedValue(tag)
      pets.findById.mockResolvedValue(pet)
      users.findById.mockResolvedValue(owner)

      await useCase.execute({ publicId: '7F4K9M2Q' })

      expect(cache.set).toHaveBeenCalledWith(
        profileCacheKey('7F4K9M2Q'),
        expect.any(String),
        PROFILE_CACHE_TTL_LOST_SECONDS,
      )
    })
  })
})
