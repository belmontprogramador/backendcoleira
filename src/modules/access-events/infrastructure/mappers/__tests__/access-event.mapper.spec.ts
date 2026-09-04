import { AccessEventMapper } from '../access-event.mapper'
import { AccessEvent } from '../../../domain/entities/access-event.entity'
import { AccessSource } from '../../../../../common/constants/access-source'
import type { AccessEventModel } from '../../../../../generated/prisma/models/AccessEvent'

describe('AccessEventMapper', () => {
  it('converte domain → persistence (snake_case)', () => {
    const ev = AccessEvent.create({
      id: 'ev-1',
      petId: 'pet-1',
      nfcTagId: 'tag-1',
      source: AccessSource.NFC,
      ipHash: 'hash',
    })

    const p = AccessEventMapper.toPersistence(ev)

    expect(p).toEqual({
      id: 'ev-1',
      pet_id: 'pet-1',
      nfc_tag_id: 'tag-1',
      source: AccessSource.NFC,
      device_type: null,
      ip_hash: 'hash',
      location_approx: null,
      latitude: null,
      longitude: null,
      created_at: ev.createdAt,
    })
  })

  it('converte model → domain', () => {
    const model = {
      id: 'ev-1',
      pet_id: 'pet-1',
      nfc_tag_id: null,
      source: 'QR',
      device_type: null,
      ip_hash: null,
      location_approx: null,
      latitude: -22.9068,
      longitude: -43.1729,
      created_at: new Date('2026-01-01T00:00:00.000Z'),
    } as unknown as AccessEventModel

    const ev = AccessEventMapper.toDomain(model)

    expect(ev.id).toBe('ev-1')
    expect(ev.petId).toBe('pet-1')
    expect(ev.source).toBe(AccessSource.QR)
    expect(ev.latitude).toBe(-22.9068)
    expect(ev.longitude).toBe(-43.1729)
    expect(ev.createdAt).toEqual(new Date('2026-01-01T00:00:00.000Z'))
  })
})
