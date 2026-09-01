import { ListContactMessagesUseCase } from '../list-contact-messages.use-case'
import {
  PetNotFoundError,
  PetOwnerMismatchError,
} from '../../../../pets/application/errors'
import type { ContactMessageRepositoryPort } from '../../../domain/repositories/contact-message.repository.port'
import type { PetRepositoryPort } from '../../../../pets/domain/repositories/pet.repository.port'
import { ContactMessage } from '../../../domain/entities/contact-message.entity'
import { AccessSource } from '../../../../../common/constants/access-source'
import { Pet } from '../../../../pets/domain/entities/pet.entity'
import { PetSpecies } from '../../../../pets/domain/value-objects/pet-species.vo'

describe('ListContactMessagesUseCase', () => {
  let messages: jest.Mocked<ContactMessageRepositoryPort>
  let pets: jest.Mocked<PetRepositoryPort>
  let useCase: ListContactMessagesUseCase

  beforeEach(() => {
    messages = {
      save: jest.fn(),
      findById: jest.fn(),
      listByPet: jest.fn(),
      listByOwner: jest.fn(),
    }
    pets = {
      findById: jest.fn(),
      listByOwner: jest.fn(),
      listAll: jest.fn(),
      save: jest.fn(),
    }
    useCase = new ListContactMessagesUseCase(messages, pets)
  })

  function makePet(ownerId = 'user-1'): Pet {
    return Pet.create({
      id: 'pet-1',
      ownerId,
      name: 'Thor',
      species: PetSpecies.create('Cão'),
    })
  }

  function makeMessage(): ContactMessage {
    return ContactMessage.reconstitute({
      id: 'msg-1',
      petId: 'pet-1',
      nfcTagId: null,
      senderName: 'Ana',
      senderPhone: '(21) 98888-7777',
      senderEmail: 'ana@example.com',
      message: 'Achei seu cachorro!',
      source: AccessSource.QR,
      ipHash: 'ip-hash',
      userAgent: 'iPhone',
      locationApprox: null,
      readAt: null,
      createdAt: new Date('2026-01-01T00:00:00Z'),
    })
  }

  it('com petId informado valida ownership e lista por pet', async () => {
    pets.findById.mockResolvedValue(makePet())
    messages.listByPet.mockResolvedValue([makeMessage()])

    const result = await useCase.execute({
      actorId: 'user-1',
      petId: 'pet-1',
      page: 1,
      limit: 20,
    })

    expect(pets.findById).toHaveBeenCalledWith('pet-1')
    expect(messages.listByPet).toHaveBeenCalledWith('pet-1', 1, 20)
    expect(messages.listByOwner).not.toHaveBeenCalled()
    expect(result).toHaveLength(1)
  })

  it('lança PetNotFoundError quando o pet informado não existe', async () => {
    pets.findById.mockResolvedValue(null)

    await expect(
      useCase.execute({
        actorId: 'user-1',
        petId: 'pet-x',
        page: 1,
        limit: 20,
      }),
    ).rejects.toThrow(PetNotFoundError)
    expect(messages.listByPet).not.toHaveBeenCalled()
  })

  it('lança PetOwnerMismatchError quando o pet não é do ator', async () => {
    pets.findById.mockResolvedValue(makePet('user-2'))

    await expect(
      useCase.execute({
        actorId: 'user-1',
        petId: 'pet-1',
        page: 1,
        limit: 20,
      }),
    ).rejects.toThrow(PetOwnerMismatchError)
    expect(messages.listByPet).not.toHaveBeenCalled()
  })

  it('sem petId lista por dono (inbox geral do tutor)', async () => {
    messages.listByOwner.mockResolvedValue([makeMessage()])

    const result = await useCase.execute({
      actorId: 'user-1',
      page: 1,
      limit: 20,
    })

    expect(messages.listByOwner).toHaveBeenCalledWith('user-1', 1, 20)
    expect(pets.findById).not.toHaveBeenCalled()
    expect(result).toHaveLength(1)
  })
})
