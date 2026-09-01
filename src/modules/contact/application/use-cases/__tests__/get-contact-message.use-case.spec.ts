import { GetContactMessageUseCase } from '../get-contact-message.use-case'
import {
  PetNotFoundError,
  PetOwnerMismatchError,
} from '../../../../pets/application/errors'
import { ContactMessageNotFoundError } from '../../errors'
import type { ContactMessageRepositoryPort } from '../../../domain/repositories/contact-message.repository.port'
import type { PetRepositoryPort } from '../../../../pets/domain/repositories/pet.repository.port'
import { ContactMessage } from '../../../domain/entities/contact-message.entity'
import { AccessSource } from '../../../../../common/constants/access-source'
import { Pet } from '../../../../pets/domain/entities/pet.entity'
import { PetSpecies } from '../../../../pets/domain/value-objects/pet-species.vo'

describe('GetContactMessageUseCase', () => {
  let messages: jest.Mocked<ContactMessageRepositoryPort>
  let pets: jest.Mocked<PetRepositoryPort>
  let useCase: GetContactMessageUseCase

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
    useCase = new GetContactMessageUseCase(messages, pets)
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

  it('retorna a mensagem quando o ator é dono do pet', async () => {
    messages.findById.mockResolvedValue(makeMessage())
    pets.findById.mockResolvedValue(makePet())

    const result = await useCase.execute('user-1', 'msg-1')

    expect(messages.findById).toHaveBeenCalledWith('msg-1')
    expect(pets.findById).toHaveBeenCalledWith('pet-1')
    expect(result.id).toBe('msg-1')
  })

  it('lança ContactMessageNotFoundError quando a mensagem não existe', async () => {
    messages.findById.mockResolvedValue(null)

    await expect(useCase.execute('user-1', 'msg-x')).rejects.toThrow(
      ContactMessageNotFoundError,
    )
    expect(pets.findById).not.toHaveBeenCalled()
  })

  it('lança PetNotFoundError quando o pet referenciado não existe', async () => {
    messages.findById.mockResolvedValue(makeMessage())
    pets.findById.mockResolvedValue(null)

    await expect(useCase.execute('user-1', 'msg-1')).rejects.toThrow(
      PetNotFoundError,
    )
  })

  it('lança PetOwnerMismatchError quando o pet não é do ator', async () => {
    messages.findById.mockResolvedValue(makeMessage())
    pets.findById.mockResolvedValue(makePet('user-2'))

    await expect(useCase.execute('user-1', 'msg-1')).rejects.toThrow(
      PetOwnerMismatchError,
    )
  })
})
