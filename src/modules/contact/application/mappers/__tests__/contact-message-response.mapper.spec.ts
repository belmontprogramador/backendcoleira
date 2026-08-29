import { ContactMessageResponseMapper } from '../contact-message-response.mapper'
import { ContactMessage } from '../../../domain/entities/contact-message.entity'
import { AccessSource } from '../../../../../common/constants/access-source'

describe('ContactMessageResponseMapper', () => {
  it('mapeia a mensagem para a resposta do tutor (sem dados internos)', () => {
    const message = ContactMessage.reconstitute({
      id: 'msg-1',
      petId: 'pet-1',
      nfcTagId: 'tag-1',
      senderName: 'Ana',
      senderPhone: '(21) 98888-7777',
      senderEmail: 'ana@example.com',
      message: 'Achei seu cachorro!',
      source: AccessSource.QR,
      ipHash: 'ip-hash-secreto',
      userAgent: 'iPhone',
      readAt: new Date('2026-06-01T12:00:00Z'),
      createdAt: new Date('2026-01-01T00:00:00Z'),
    })

    const result = ContactMessageResponseMapper.toResponse(message)

    expect(result).toEqual({
      id: 'msg-1',
      petId: 'pet-1',
      senderName: 'Ana',
      senderPhone: '(21) 98888-7777',
      senderEmail: 'ana@example.com',
      message: 'Achei seu cachorro!',
      source: AccessSource.QR,
      isRead: true,
      readAt: new Date('2026-06-01T12:00:00Z'),
      createdAt: new Date('2026-01-01T00:00:00Z'),
    })
    // dados internos não vazam para o tutor
    expect(result).not.toHaveProperty('ipHash')
    expect(result).not.toHaveProperty('userAgent')
    expect(result).not.toHaveProperty('nfcTagId')
  })

  it('mapeia mensagem não lida com isRead=false e readAt=null', () => {
    const message = ContactMessage.reconstitute({
      id: 'msg-2',
      petId: 'pet-1',
      nfcTagId: null,
      senderName: null,
      senderPhone: null,
      senderEmail: null,
      message: 'Oi',
      source: AccessSource.DIRECT,
      ipHash: null,
      userAgent: null,
      readAt: null,
      createdAt: new Date('2026-01-01T00:00:00Z'),
    })

    const result = ContactMessageResponseMapper.toResponse(message)

    expect(result.isRead).toBe(false)
    expect(result.readAt).toBeNull()
    expect(result.senderName).toBeNull()
  })
})
