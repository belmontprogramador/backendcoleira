import { ListAllPetsUseCase } from '../list-all-pets.use-case'
import type { PetRepositoryPort } from '../../../domain/repositories/pet.repository.port'
import { Pet } from '../../../domain/entities/pet.entity'
import { PetSpecies } from '../../../domain/value-objects/pet-species.vo'

describe('ListAllPetsUseCase', () => {
  let pets: jest.Mocked<PetRepositoryPort>

  beforeEach(() => {
    pets = {
      findById: jest.fn(),
      listByOwner: jest.fn(),
      listAll: jest.fn(),
      save: jest.fn(),
    }
  })

  function makePet(ownerId: string, name: string): Pet {
    return Pet.create({
      id: `pet-${name}`,
      ownerId,
      name,
      species: PetSpecies.create('Cão'),
    })
  }

  it('lista todos sem filtro', async () => {
    pets.listAll.mockResolvedValue([makePet('user-1', 'Thor')])
    const useCase = new ListAllPetsUseCase(pets)

    const result = await useCase.execute({ page: 1, limit: 20 })
    expect(result).toHaveLength(1)
    expect(pets.listAll).toHaveBeenCalledWith({ page: 1, limit: 20 })
  })

  it('repassa ownerId ao repositório', async () => {
    pets.listAll.mockResolvedValue([])
    const useCase = new ListAllPetsUseCase(pets)

    await useCase.execute({ page: 1, limit: 20, ownerId: 'user-1' })
    expect(pets.listAll).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      ownerId: 'user-1',
    })
  })
})
