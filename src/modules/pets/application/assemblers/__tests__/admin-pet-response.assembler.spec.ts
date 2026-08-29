import { Pet } from '../../../domain/entities/pet.entity'
import { PetSpecies } from '../../../domain/value-objects/pet-species.vo'
import type { PetOwnerInfoPort } from '../../../domain/repositories/pet-owner-info.port'
import { AdminPetResponseAssembler } from '../admin-pet-response.assembler'

describe('AdminPetResponseAssembler', () => {
  const owners: jest.Mocked<PetOwnerInfoPort> = {
    findByIds: jest.fn(),
  }

  const assembler = new AdminPetResponseAssembler(owners)

  function makePet(id: string, ownerId: string, name: string): Pet {
    return Pet.create({ id, ownerId, name, species: PetSpecies.create('Cão') })
  }

  beforeEach(() => {
    owners.findByIds.mockReset()
  })

  it('resolve os donos em lote e mapeia owner por pet', async () => {
    owners.findByIds.mockResolvedValue([
      { id: 'u1', name: 'Dono 1', email: 'd1@email.com' },
      { id: 'u2', name: 'Dono 2', email: 'd2@email.com' },
    ])
    const pets = [makePet('p1', 'u1', 'Thor'), makePet('p2', 'u2', 'Rex')]

    const result = await assembler.toResponses(pets)

    expect(owners.findByIds).toHaveBeenCalledWith(['u1', 'u2'])
    expect(result[0].owner).toEqual({
      id: 'u1',
      name: 'Dono 1',
      email: 'd1@email.com',
    })
    expect(result[1].owner).toEqual({
      id: 'u2',
      name: 'Dono 2',
      email: 'd2@email.com',
    })
  })

  it('deduplica ownerIds antes da consulta (sem N+1)', async () => {
    owners.findByIds.mockResolvedValue([
      { id: 'u1', name: 'Dono 1', email: 'd1@email.com' },
    ])
    const pets = [makePet('p1', 'u1', 'Thor'), makePet('p2', 'u1', 'Loki')]

    await assembler.toResponses(pets)

    expect(owners.findByIds).toHaveBeenCalledWith(['u1'])
    expect(owners.findByIds).toHaveBeenCalledTimes(1)
  })

  it('owner null quando o dono não é encontrado', async () => {
    owners.findByIds.mockResolvedValue([])
    const pets = [makePet('p1', 'u1', 'Thor')]

    const result = await assembler.toResponses(pets)

    expect(result[0].owner).toBeNull()
  })

  it('toResponse resolve um único dono', async () => {
    owners.findByIds.mockResolvedValue([
      { id: 'u1', name: 'Dono 1', email: 'd1@email.com' },
    ])
    const pet = makePet('p1', 'u1', 'Thor')

    const result = await assembler.toResponse(pet)

    expect(owners.findByIds).toHaveBeenCalledWith(['u1'])
    expect(result.owner).toEqual({
      id: 'u1',
      name: 'Dono 1',
      email: 'd1@email.com',
    })
  })

  it('preserva os campos do PetResponse base', async () => {
    owners.findByIds.mockResolvedValue([
      { id: 'u1', name: 'Dono 1', email: 'd1@email.com' },
    ])
    const pet = makePet('p1', 'u1', 'Thor')
    pet.updateProfile({ city: 'Araruama' })
    pet.markLost()

    const result = await assembler.toResponse(pet)

    expect(result.id).toBe('p1')
    expect(result.name).toBe('Thor')
    expect(result.species).toBe('Cão')
    expect(result.city).toBe('Araruama')
    expect(result.lostStatus).toBe(true)
    expect(result.privacy).toBeDefined()
  })
})
