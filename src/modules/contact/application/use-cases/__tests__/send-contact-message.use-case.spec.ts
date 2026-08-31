import { SendContactMessageUseCase } from '../send-contact-message.use-case'
import { AccessSource } from '../../../../../common/constants/access-source'
import { TagNotFoundError } from '../../../../nfc/application/errors'
import { PetNotFoundError } from '../../../../pets/application/errors'
import { UserNotFoundError } from '../../../../users/application/errors'
import { TagNotActivatedError } from '../../errors'
import type { NfcTagRepositoryPort } from '../../../../nfc/domain/repositories/nfc-tag.repository.port'
import type { PetRepositoryPort } from '../../../../pets/domain/repositories/pet.repository.port'
import type { UserRepositoryPort } from '../../../../users/domain/repositories/user.repository.port'
import type { ContactMessageRepositoryPort } from '../../../domain/repositories/contact-message.repository.port'
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

jest.mock('node:crypto', () => ({ randomUUID: () => 'message-uuid-1' }))

describe('SendContactMessageUseCase', () => {
  let tags: jest.Mocked<NfcTagRepositoryPort>
  let pets: jest.Mocked<PetRepositoryPort>
  let users: jest.Mocked<UserRepositoryPort>
  let messages: jest.Mocked<ContactMessageRepositoryPort>
  let email: jest.Mocked<EmailSenderPort>
  let whatsapp: jest.Mocked<WhatsAppSenderPort>
  let useCase: SendContactMessageUseCase

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
    messages = {
      save: jest.fn(),
      findById: jest.fn(),
      listByPet: jest.fn(),
      listByOwner: jest.fn(),
    }
    email = {
      sendVerificationEmail: jest.fn(),
      sendPasswordResetEmail: jest.fn(),
      sendTransferEmail: jest.fn(),
      sendContactMessageEmail: jest.fn(),
    }
    whatsapp = { sendContactMessage: jest.fn() }

    email.sendContactMessageEmail.mockResolvedValue(undefined)
    whatsapp.sendContactMessage.mockResolvedValue(undefined)
    messages.save.mockResolvedValue(undefined)

    useCase = new SendContactMessageUseCase(
      tags,
      pets,
      users,
      messages,
      email,
      whatsapp,
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

  function makeOwner(phone: string | null = '(21) 99999-9999'): User {
    return User.create({
      id: 'user-1',
      name: 'João Silva',
      email: Email.create('joao@example.com'),
      passwordHash: 'hash',
      phone,
    })
  }

  const baseInput = {
    publicId: '7F4K9M2Q',
    senderName: 'Ana',
    senderPhone: '(21) 98888-7777',
    message: 'Achei seu cachorro!',
    source: AccessSource.QR,
    ipHash: 'ip-hash',
    userAgent: 'iPhone',
  }

  it('resolve tag→pet→owner, salva a mensagem e envia e-mail + WhatsApp', async () => {
    tags.findByPublicId.mockResolvedValue(makeTag('pet-1'))
    pets.findById.mockResolvedValue(makePet())
    users.findById.mockResolvedValue(makeOwner())

    const result = await useCase.execute(baseInput)

    expect(result).toEqual({ messageId: 'message-uuid-1' })
    expect(tags.findByPublicId).toHaveBeenCalledWith('7F4K9M2Q')
    expect(pets.findById).toHaveBeenCalledWith('pet-1')
    expect(users.findById).toHaveBeenCalledWith('user-1')

    const saved = messages.save.mock.calls[0][0]
    expect(messages.save).toHaveBeenCalledTimes(1)
    expect(saved.id).toBe('message-uuid-1')
    expect(saved.petId).toBe('pet-1')
    expect(saved.nfcTagId).toBe('tag-1')
    expect(saved.message).toBe('Achei seu cachorro!')
    expect(saved.source).toBe(AccessSource.QR)

    expect(email.sendContactMessageEmail).toHaveBeenCalledWith(
      'joao@example.com',
      expect.objectContaining({
        petName: 'Thor',
        message: 'Achei seu cachorro!',
        senderName: 'Ana',
      }),
    )
    expect(whatsapp.sendContactMessage).toHaveBeenCalledWith(
      '(21) 99999-9999',
      expect.stringContaining('Achei seu cachorro!'),
    )
  })

  it('lança TagNotFoundError quando a tag não existe', async () => {
    tags.findByPublicId.mockResolvedValue(null)

    await expect(useCase.execute(baseInput)).rejects.toThrow(TagNotFoundError)
    expect(messages.save).not.toHaveBeenCalled()
  })

  it('lança TagNotActivatedError quando a tag não tem pet', async () => {
    tags.findByPublicId.mockResolvedValue(makeTag(null))

    await expect(useCase.execute(baseInput)).rejects.toThrow(
      TagNotActivatedError,
    )
    expect(pets.findById).not.toHaveBeenCalled()
    expect(messages.save).not.toHaveBeenCalled()
  })

  it('lança TagNotActivatedError quando o pet é soft-deletado', async () => {
    const pet = makePet()
    pet.deactivate()
    tags.findByPublicId.mockResolvedValue(makeTag('pet-1'))
    pets.findById.mockResolvedValue(pet)

    await expect(useCase.execute(baseInput)).rejects.toThrow(
      TagNotActivatedError,
    )
    expect(users.findById).not.toHaveBeenCalled()
    expect(messages.save).not.toHaveBeenCalled()
  })

  it('lança PetNotFoundError quando o pet referenciado não existe', async () => {
    tags.findByPublicId.mockResolvedValue(makeTag('pet-1'))
    pets.findById.mockResolvedValue(null)

    await expect(useCase.execute(baseInput)).rejects.toThrow(PetNotFoundError)
    expect(messages.save).not.toHaveBeenCalled()
  })

  it('lança UserNotFoundError quando o tutor não existe', async () => {
    tags.findByPublicId.mockResolvedValue(makeTag('pet-1'))
    pets.findById.mockResolvedValue(makePet())
    users.findById.mockResolvedValue(null)

    await expect(useCase.execute(baseInput)).rejects.toThrow(UserNotFoundError)
    expect(messages.save).not.toHaveBeenCalled()
  })

  it('não envia WhatsApp quando o tutor não tem telefone', async () => {
    tags.findByPublicId.mockResolvedValue(makeTag('pet-1'))
    pets.findById.mockResolvedValue(makePet())
    users.findById.mockResolvedValue(makeOwner(null))

    const result = await useCase.execute(baseInput)

    expect(result).toEqual({ messageId: 'message-uuid-1' })
    expect(email.sendContactMessageEmail).toHaveBeenCalled()
    expect(whatsapp.sendContactMessage).not.toHaveBeenCalled()
  })

  it('retorna sucesso mesmo se o WhatsApp falhar (e-mail já enviado)', async () => {
    tags.findByPublicId.mockResolvedValue(makeTag('pet-1'))
    pets.findById.mockResolvedValue(makePet())
    users.findById.mockResolvedValue(makeOwner())
    whatsapp.sendContactMessage.mockRejectedValue(new Error('WhatsApp down'))

    const result = await useCase.execute(baseInput)

    expect(result).toEqual({ messageId: 'message-uuid-1' })
    expect(email.sendContactMessageEmail).toHaveBeenCalled()
    expect(messages.save).toHaveBeenCalled()
  })

  it('retorna sucesso mesmo se o e-mail falhar (mensagem persiste no inbox)', async () => {
    tags.findByPublicId.mockResolvedValue(makeTag('pet-1'))
    pets.findById.mockResolvedValue(makePet())
    users.findById.mockResolvedValue(makeOwner())
    email.sendContactMessageEmail.mockRejectedValue(new Error('SMTP down'))

    const result = await useCase.execute(baseInput)

    expect(result).toEqual({ messageId: 'message-uuid-1' })
    expect(messages.save).toHaveBeenCalled()
  })

  it('normaliza campos opcionais ausentes para null', async () => {
    tags.findByPublicId.mockResolvedValue(makeTag('pet-1'))
    pets.findById.mockResolvedValue(makePet())
    users.findById.mockResolvedValue(makeOwner())

    await useCase.execute({
      publicId: '7F4K9M2Q',
      message: 'Oi',
      source: AccessSource.DIRECT,
    })

    const saved = messages.save.mock.calls[0][0]
    expect(saved.senderName).toBeNull()
    expect(saved.senderPhone).toBeNull()
    expect(saved.senderEmail).toBeNull()
    expect(saved.ipHash).toBeNull()
    expect(saved.userAgent).toBeNull()
  })
})
