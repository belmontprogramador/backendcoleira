import { randomUUID } from 'node:crypto'
import { CreatePetUseCase } from '../create-pet.use-case'
import type { PetRepositoryPort } from '../../../domain/repositories/pet.repository.port'
import type { AuditLoggerPort } from '../../../../../common/ports/audit-logger.port'
import { Pet } from '../../../domain/entities/pet.entity'
import { PetSpecies } from '../../../domain/value-objects/pet-species.vo'

jest.mock('node:crypto', () => ({
  randomUUID: () => 'pet-uuid-1',
}))

describe('CreatePetUseCase', () => {
  let pets: jest.Mocked<PetRepositoryPort>
  let audit: jest.Mocked<AuditLoggerPort>
  let useCase: CreatePetUseCase

  beforeEach(() => {
    pets = { findById: jest.fn(), listByOwner: jest.fn(), save: jest.fn() }
    audit = { log: jest.fn() }
    useCase = new CreatePetUseCase(pets, audit)
  })

  it('cria um pet para o owner autenticado', async () => {
    const result = await useCase.execute('user-1', {
      name: 'Thor',
      species: 'Cão',
      breed: 'Shih Tzu',
    })

    expect(result.id).toBe('pet-uuid-1')
    expect(result.ownerId).toBe('user-1')
    expect(result.name).toBe('Thor')

    const saved = pets.save.mock.calls[0][0]
    expect(saved.ownerId).toBe('user-1')
    expect(saved.lostStatus).toBe(false)
  })

  it('cria com campos opcionais e converte birthDate', async () => {
    const result = await useCase.execute('user-1', {
      name: 'Loki',
      species: 'Gato',
      sex: 'MALE',
      birthDate: '2020-01-15T00:00:00.000Z',
      city: 'Araruama',
    })

    expect(result.sex).toBe('MALE')
    expect(result.city).toBe('Araruama')
    expect(result.birthDate?.toISOString()).toBe('2020-01-15T00:00:00.000Z')
  })

  it('audita a criação', async () => {
    await useCase.execute('user-1', { name: 'Thor', species: 'Cão' })

    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'create',
        entity: 'pet',
        entityId: 'pet-uuid-1',
      }),
    )
  })
})
