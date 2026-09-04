import { AccessEventsController } from '../access-events.controller'
import { ListAccessEventsUseCase } from '../../../application/use-cases/list-access-events.use-case'
import { AccessEvent } from '../../../domain/entities/access-event.entity'
import { AccessSource } from '../../../../../common/constants/access-source'

describe('AccessEventsController', () => {
  let list: jest.Mocked<ListAccessEventsUseCase>
  let controller: AccessEventsController

  const user = { sub: 'user-1', email: 'owner@email.com' }

  function makeEvent() {
    return AccessEvent.reconstitute({
      id: 'ev-1',
      petId: 'pet-1',
      nfcTagId: 'tag-1',
      source: AccessSource.NFC,
      deviceType: 'iPhone',
      ipHash: 'secret-hash',
      locationApprox: 'São Paulo',
      latitude: null,
      longitude: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    })
  }

  beforeEach(() => {
    list = { execute: jest.fn() } as jest.Mocked<ListAccessEventsUseCase>
    controller = new AccessEventsController(list)
  })

  it('list: mapeia acessos e não vaza ipHash/nfcTagId', async () => {
    list.execute.mockResolvedValue([makeEvent()])

    const result = await controller.list(user, 'pet-1')

    expect(list.execute).toHaveBeenCalledWith('user-1', 'pet-1')
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      id: 'ev-1',
      petId: 'pet-1',
      source: 'NFC',
      deviceType: 'iPhone',
      locationApprox: 'São Paulo',
    })
    expect(result[0]).not.toHaveProperty('ipHash')
    expect(result[0]).not.toHaveProperty('nfcTagId')
  })
})
