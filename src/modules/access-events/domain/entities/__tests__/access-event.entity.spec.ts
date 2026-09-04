import { AccessEvent } from '../access-event.entity'
import { AccessSource } from '../../../../../common/constants/access-source'

describe('AccessEvent (entity)', () => {
  it('cria um evento com source, ids e timestamp', () => {
    const ev = AccessEvent.create({
      id: 'ev-1',
      petId: 'pet-1',
      nfcTagId: 'tag-1',
      source: AccessSource.NFC,
    })

    expect(ev.id).toBe('ev-1')
    expect(ev.petId).toBe('pet-1')
    expect(ev.nfcTagId).toBe('tag-1')
    expect(ev.source).toBe(AccessSource.NFC)
    expect(ev.createdAt).toBeInstanceOf(Date)
  })

  it('aceita campos opcionais como nulos', () => {
    const ev = AccessEvent.create({
      id: 'ev-2',
      source: AccessSource.DIRECT,
    })

    expect(ev.petId).toBeNull()
    expect(ev.nfcTagId).toBeNull()
    expect(ev.deviceType).toBeNull()
    expect(ev.ipHash).toBeNull()
    expect(ev.locationApprox).toBeNull()
    expect(ev.latitude).toBeNull()
    expect(ev.longitude).toBeNull()
  })

  it('reconstitui a partir de dados persistidos preservando createdAt', () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z')
    const ev = AccessEvent.reconstitute({
      id: 'ev-3',
      petId: 'pet-3',
      nfcTagId: null,
      source: AccessSource.QR,
      deviceType: 'iPhone',
      ipHash: 'abc123',
      locationApprox: null,
      latitude: -22.9068,
      longitude: -43.1729,
      createdAt,
    })

    expect(ev.id).toBe('ev-3')
    expect(ev.source).toBe(AccessSource.QR)
    expect(ev.deviceType).toBe('iPhone')
    expect(ev.ipHash).toBe('abc123')
    expect(ev.latitude).toBe(-22.9068)
    expect(ev.longitude).toBe(-43.1729)
    expect(ev.createdAt).toEqual(createdAt)
  })

  it('carrega coordenadas GPS quando presentes na criação', () => {
    const ev = AccessEvent.create({
      id: 'ev-4',
      source: AccessSource.NFC,
      latitude: -23.5505,
      longitude: -46.6333,
    })

    expect(ev.latitude).toBe(-23.5505)
    expect(ev.longitude).toBe(-46.6333)
  })
})
