import { ContactMessageMapper } from '../contact-message.mapper'
import { ContactMessage } from '../../../domain/entities/contact-message.entity'
import { AccessSource } from '../../../../../common/constants/access-source'
import type { ContactMessageModel } from '../../../../../generated/prisma/models/ContactMessage'

describe('ContactMessageMapper', () => {
  it('converte domain → persistence (snake_case)', () => {
    const msg = ContactMessage.create({
      id: 'msg-1',
      petId: 'pet-1',
      message: 'achei seu pet',
      source: AccessSource.DIRECT,
    })

    const p = ContactMessageMapper.toPersistence(msg)

    expect(p).toEqual({
      id: 'msg-1',
      pet_id: 'pet-1',
      nfc_tag_id: null,
      sender_name: null,
      sender_phone: null,
      sender_email: null,
      message: 'achei seu pet',
      source: AccessSource.DIRECT,
      ip_hash: null,
      user_agent: null,
      location_approx: null,
      read_at: null,
      created_at: msg.createdAt,
    })
  })

  it('converte model → domain preservando read_at', () => {
    const readAt = new Date('2026-01-02T00:00:00.000Z')
    const model = {
      id: 'msg-1',
      pet_id: 'pet-1',
      nfc_tag_id: 'tag-1',
      sender_name: 'Ana',
      sender_phone: '+5511999999999',
      sender_email: null,
      message: 'achei seu pet',
      source: 'NFC',
      ip_hash: 'hash',
      user_agent: 'UA',
      location_approx: 'São Paulo, SP, Brazil',
      read_at: readAt,
      created_at: new Date('2026-01-01T00:00:00.000Z'),
    } as unknown as ContactMessageModel

    const msg = ContactMessageMapper.toDomain(model)

    expect(msg.id).toBe('msg-1')
    expect(msg.senderName).toBe('Ana')
    expect(msg.source).toBe(AccessSource.NFC)
    expect(msg.locationApprox).toBe('São Paulo, SP, Brazil')
    expect(msg.readAt).toEqual(readAt)
    expect(msg.isRead).toBe(true)
  })
})
