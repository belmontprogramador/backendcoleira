import { randomUUID } from 'node:crypto'
import { RegisterAccessEventUseCase } from '../register-access-event.use-case'
import { AccessSource } from '../../../../../common/constants/access-source'
import type { AccessEventRepositoryPort } from '../../../domain/repositories/access-event.repository.port'

jest.mock('node:crypto', () => ({ randomUUID: () => 'event-uuid-1' }))

describe('RegisterAccessEventUseCase', () => {
  let events: jest.Mocked<AccessEventRepositoryPort>
  let useCase: RegisterAccessEventUseCase

  beforeEach(() => {
    events = { create: jest.fn() }
    useCase = new RegisterAccessEventUseCase(events)
  })

  it('cria e persiste um AccessEvent com source e ids', async () => {
    const result = await useCase.execute({
      petId: 'pet-1',
      nfcTagId: 'tag-1',
      source: AccessSource.NFC,
      ipHash: 'hash',
    })

    expect(result.id).toBe('event-uuid-1')
    expect(result.petId).toBe('pet-1')
    expect(result.nfcTagId).toBe('tag-1')
    expect(result.source).toBe(AccessSource.NFC)
    expect(result.ipHash).toBe('hash')
    expect(events.create).toHaveBeenCalledWith(result)
  })

  it('normaliza campos opcionais ausentes para null', async () => {
    const result = await useCase.execute({ source: AccessSource.DIRECT })

    expect(result.petId).toBeNull()
    expect(result.nfcTagId).toBeNull()
    expect(result.deviceType).toBeNull()
    expect(result.ipHash).toBeNull()
    expect(result.locationApprox).toBeNull()
    expect(events.create).toHaveBeenCalled()
  })
})
