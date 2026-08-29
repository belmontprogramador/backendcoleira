import { MarkContactMessageReadUseCase } from '../mark-contact-message-read.use-case'
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

describe('MarkContactMessageReadUseCase', () => {
  let messages: jest.Mocked<ContactMessageRepositoryPort>
  let pets: jest.Mocked<PetRepositoryPort>
  let useCase: MarkContactMessageReadUseCase

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
    useCase = new MarkContactMessageReadUseCase(messages, pets)
  })

  function makePet(ownerId = 'user-1'): Pet {
    return Pet.create({
      id: 'pet-1',
      ownerId,
      name: 'Thor',
      species: PetSpecies.create('Cão'),
    })
  }

  function makeMessage(readAt: Date | null = null): ContactMessage {
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
      readAt,
      createdAt: new Date('2026-01-01T00:00:00Z'),
    })
  }

  it('marca como lida, salva e retorna a mensagem', async () => {
    messages.findById.mockResolvedValue(makeMessage())
    pets.findById.mockResolvedValue(makePet())
    messages.save.mockResolvedValue(undefined)

    const result = await useCase.execute('user-1', 'msg-1')

    expect(result.isRead).toBe(true)
    expect(result.readAt).toBeInstanceOf(Date)
    expect(messages.save).toHaveBeenCalledWith(result)
  })

  it('é idempotente: preserva o timestamp da primeira leitura', async () => {
    const firstRead = new Date('2026-06-01T12:00:00Z')
    messages.findById.mockResolvedValue(makeMessage(firstRead))
    pets.findById.mockResolvedValue(makePet())
    messages.save.mockResolvedValue(undefined)

    const result = await useCase.execute('user-1', 'msg-1')

    expect(result.readAt).toEqual(firstRead)
    expect(messages.save).toHaveBeenCalledWith(result)
  })

  it('lança ContactMessageNotFoundError quando a mensagem não existe', async () => {
    messages.findById.mockResolvedValue(null)

    await expect(useCase.execute('user-1', 'msg-x')).rejects.toThrow(
      ContactMessageNotFoundError,
    )
    expect(messages.save).not.toHaveBeenCalled()
  })

  it('lança PetNotFoundError quando o pet referenciado não existe', async () => {
    messages.findById.mockResolvedValue(makeMessage())
    pets.findById.mockResolvedValue(null)

    await expect(useCase.execute('user-1', 'msg-1')).rejects.toThrow(
      PetNotFoundError,
    )
    expect(messages.save).not.toHaveBeenCalled()
  })

  it('lança PetOwnerMismatchError quando o pet não é do ator', async () => {
    messages.findById.mockResolvedValue(makeMessage())
    pets.findById.mockResolvedValue(makePet('user-2'))

    await expect(useCase.execute('user-1', 'msg-1')).rejects.toThrow(
      PetOwnerMismatchError,
    )
    expect(messages.save).not.toHaveBeenCalled()
  })
})
