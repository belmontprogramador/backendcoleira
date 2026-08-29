import { PetMedicalController } from '../pet-medical.controller'
import { GetPetMedicalUseCase } from '../../../application/use-cases/get-pet-medical.use-case'
import { UpsertPetMedicalUseCase } from '../../../application/use-cases/upsert-pet-medical.use-case'
import { PetMedical } from '../../../domain/entities/pet-medical.entity'

describe('PetMedicalController', () => {
  let getMedical: jest.Mocked<GetPetMedicalUseCase>
  let upsertMedical: jest.Mocked<UpsertPetMedicalUseCase>
  let controller: PetMedicalController

  const user = { sub: 'user-1', email: 'owner@email.com' }

  function makeMedical() {
    return PetMedical.reconstitute({
      petId: 'pet-1',
      allergies: 'pólen',
      medications: null,
      specialCare: null,
      medicalConditions: null,
      veterinarianName: 'Dr. Ana',
      veterinarianPhone: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    })
  }

  beforeEach(() => {
    getMedical = { execute: jest.fn() } as jest.Mocked<GetPetMedicalUseCase>
    upsertMedical = {
      execute: jest.fn(),
    } as jest.Mocked<UpsertPetMedicalUseCase>
    controller = new PetMedicalController(getMedical, upsertMedical)
  })

  it('get: retorna null quando não há registro', async () => {
    getMedical.execute.mockResolvedValue(null)

    const result = await controller.get(user, 'pet-1')

    expect(result).toBeNull()
    expect(getMedical.execute).toHaveBeenCalledWith('user-1', 'pet-1')
  })

  it('get: mapeia para camelCase', async () => {
    getMedical.execute.mockResolvedValue(makeMedical())

    const result = await controller.get(user, 'pet-1')

    expect(result).toMatchObject({
      petId: 'pet-1',
      allergies: 'pólen',
      veterinarianName: 'Dr. Ana',
    })
  })

  it('put: delega ao upsert com os dados', async () => {
    upsertMedical.execute.mockResolvedValue(makeMedical())

    const result = await controller.upsert(user, 'pet-1', {
      allergies: 'pólen',
    })

    expect(upsertMedical.execute).toHaveBeenCalledWith('user-1', 'pet-1', {
      allergies: 'pólen',
    })
    expect(result).toMatchObject({ petId: 'pet-1', allergies: 'pólen' })
  })
})
