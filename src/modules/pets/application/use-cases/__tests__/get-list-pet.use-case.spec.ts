import { GetPetUseCase } from '../get-pet.use-case'
import { ListUserPetsUseCase } from '../list-user-pets.use-case'
import { PetNotFoundError, PetOwnerMismatchError } from '../../errors'
import type { PetRepositoryPort } from '../../../domain/repositories/pet.repository.port'
import { Pet } from '../../../domain/entities/pet.entity'
import { PetSpecies } from '../../../domain/value-objects/pet-species.vo'

describe('Pets — leitura e ownership', () => {
  let pets: jest.Mocked<PetRepositoryPort>

  beforeEach(() => {
    pets = { findById: jest.fn(), listByOwner: jest.fn(), save: jest.fn() }
  })

  function makePet(ownerId: string, name: string): Pet {
    return Pet.create({
      id: `pet-${name}`,
      ownerId,
      name,
      species: PetSpecies.create('Cão'),
    })
  }

  describe('GetPetUseCase', () => {
    it('retorna pet do owner', async () => {
      const pet = makePet('user-1', 'Thor')
      pets.findById.mockResolvedValue(pet)
      const useCase = new GetPetUseCase(pets)

      const result = await useCase.execute('user-1', 'pet-Thor')
      expect(result.id).toBe('pet-Thor')
    })

    it('lança PetNotFoundError se não existe', async () => {
      pets.findById.mockResolvedValue(null)
      const useCase = new GetPetUseCase(pets)

      await expect(useCase.execute('user-1', 'x')).rejects.toThrow(
        PetNotFoundError,
      )
    })

    it('lança PetOwnerMismatchError se pet é de outro dono (IDOR)', async () => {
      const pet = makePet('user-2', 'Thor')
      pets.findById.mockResolvedValue(pet)
      const useCase = new GetPetUseCase(pets)

      await expect(useCase.execute('user-1', 'pet-Thor')).rejects.toThrow(
        PetOwnerMismatchError,
      )
    })
  })

  describe('ListUserPetsUseCase', () => {
    it('lista pets do owner', async () => {
      pets.listByOwner.mockResolvedValue([
        makePet('user-1', 'Thor'),
        makePet('user-1', 'Loki'),
      ])
      const useCase = new ListUserPetsUseCase(pets)

      const result = await useCase.execute('user-1')
      expect(result).toHaveLength(2)
      expect(pets.listByOwner).toHaveBeenCalledWith('user-1')
    })
  })
})
