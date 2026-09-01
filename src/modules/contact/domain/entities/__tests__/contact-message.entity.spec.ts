import {
  ContactMessage,
  InvalidContactMessageError,
} from '../contact-message.entity'
import { AccessSource } from '../../../../../common/constants/access-source'

describe('ContactMessage (entity)', () => {
  it('cria uma mensagem válida com trim e dados do remetente', () => {
    const msg = ContactMessage.create({
      id: 'msg-1',
      petId: 'pet-1',
      message: '  Achei seu cachorro!  ',
      source: AccessSource.QR,
      senderName: 'Ana',
      locationApprox: 'São Paulo, SP, Brazil',
    })

    expect(msg.id).toBe('msg-1')
    expect(msg.message).toBe('Achei seu cachorro!')
    expect(msg.source).toBe(AccessSource.QR)
    expect(msg.senderName).toBe('Ana')
    expect(msg.locationApprox).toBe('São Paulo, SP, Brazil')
    expect(msg.isRead).toBe(false)
    expect(msg.readAt).toBeNull()
  })

  it('rejeita mensagem vazia ou só com espaços', () => {
    expect(() =>
      ContactMessage.create({
        id: 'msg-2',
        petId: 'pet-1',
        message: '   ',
        source: AccessSource.DIRECT,
      }),
    ).toThrow(InvalidContactMessageError)
  })

  it('marca como lida apenas uma vez (idempotente)', () => {
    const msg = ContactMessage.create({
      id: 'msg-3',
      petId: 'pet-1',
      message: 'oi',
      source: AccessSource.NFC,
    })

    msg.markRead()
    const first = msg.readAt
    expect(first).toBeInstanceOf(Date)
    expect(msg.isRead).toBe(true)

    msg.markRead()
    expect(msg.readAt).toEqual(first)
  })

  it('reconstitui preservando readAt e createdAt', () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z')
    const readAt = new Date('2026-01-02T00:00:00.000Z')
    const msg = ContactMessage.reconstitute({
      id: 'msg-4',
      petId: 'pet-1',
      nfcTagId: 'tag-1',
      senderName: 'Ana',
      senderPhone: '+5511999999999',
      senderEmail: 'ana@example.com',
      message: 'achei seu pet',
      source: AccessSource.NFC,
      ipHash: 'hash',
      userAgent: 'Mozilla/5.0',
      locationApprox: 'São Paulo, SP, Brazil',
      readAt,
      createdAt,
    })

    expect(msg.senderEmail).toBe('ana@example.com')
    expect(msg.senderPhone).toBe('+5511999999999')
    expect(msg.locationApprox).toBe('São Paulo, SP, Brazil')
    expect(msg.readAt).toEqual(readAt)
    expect(msg.createdAt).toEqual(createdAt)
    expect(msg.isRead).toBe(true)
  })
})
