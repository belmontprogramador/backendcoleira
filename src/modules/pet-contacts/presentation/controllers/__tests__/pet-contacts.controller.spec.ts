import { PetContactsController } from '../pet-contacts.controller'
import { ListPetContactsUseCase } from '../../../application/use-cases/list-pet-contacts.use-case'
import { CreatePetContactUseCase } from '../../../application/use-cases/create-pet-contact.use-case'
import { UpdatePetContactUseCase } from '../../../application/use-cases/update-pet-contact.use-case'
import { DeletePetContactUseCase } from '../../../application/use-cases/delete-pet-contact.use-case'
import { PetContact } from '../../../domain/entities/pet-contact.entity'

describe('PetContactsController', () => {
  let list: jest.Mocked<ListPetContactsUseCase>
  let create: jest.Mocked<CreatePetContactUseCase>
  let update: jest.Mocked<UpdatePetContactUseCase>
  let remove: jest.Mocked<DeletePetContactUseCase>
  let controller: PetContactsController

  const user = { sub: 'user-1', email: 'owner@email.com' }

  function makeContact() {
    return PetContact.reconstitute({
      id: 'c-1',
      petId: 'pet-1',
      name: 'Maria',
      phone: '11999999999',
      email: null,
      relationship: 'Mãe',
      isPrimary: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    })
  }

  beforeEach(() => {
    list = { execute: jest.fn() } as jest.Mocked<ListPetContactsUseCase>
    create = { execute: jest.fn() } as jest.Mocked<CreatePetContactUseCase>
    update = { execute: jest.fn() } as jest.Mocked<UpdatePetContactUseCase>
    remove = { execute: jest.fn() } as jest.Mocked<DeletePetContactUseCase>
    controller = new PetContactsController(list, create, update, remove)
  })

  it('list: mapeia contatos para camelCase', async () => {
    list.execute.mockResolvedValue([makeContact()])

    const result = await controller.list(user, 'pet-1')

    expect(list.execute).toHaveBeenCalledWith('user-1', 'pet-1')
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      id: 'c-1',
      isPrimary: true,
      petId: 'pet-1',
    })
  })

  it('create: delega e mapeia', async () => {
    create.execute.mockResolvedValue(makeContact())

    const result = await controller.create(user, 'pet-1', { name: 'Maria' })

    expect(create.execute).toHaveBeenCalledWith('user-1', 'pet-1', {
      name: 'Maria',
    })
    expect(result).toMatchObject({ id: 'c-1', name: 'Maria' })
  })

  it('update: delega e mapeia', async () => {
    update.execute.mockResolvedValue(makeContact())

    const result = await controller.update(user, 'pet-1', 'c-1', {
      name: 'Maria S.',
    })

    expect(update.execute).toHaveBeenCalledWith('user-1', 'pet-1', 'c-1', {
      name: 'Maria S.',
    })
    expect(result).toMatchObject({ id: 'c-1', name: 'Maria' })
  })

  it('delete: delega e retorna 204 (void)', async () => {
    remove.execute.mockResolvedValue(undefined)

    await controller.remove(user, 'pet-1', 'c-1')

    expect(remove.execute).toHaveBeenCalledWith('user-1', 'pet-1', 'c-1')
  })
})
