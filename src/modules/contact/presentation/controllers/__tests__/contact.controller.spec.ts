import { ContactController } from '../contact.controller'
import { SendContactMessageUseCase } from '../../../application/use-cases/send-contact-message.use-case'
import { AccessSource } from '../../../../../common/constants/access-source'
import type { IpHasherPort } from '../../../../../common/ports/ip-hasher.port'
import type { ContactDto } from '../../../application/dtos/contact.schema'

describe('ContactController', () => {
  let sendContactMessage: jest.Mocked<SendContactMessageUseCase>
  let ipHasher: jest.Mocked<IpHasherPort>
  let controller: ContactController

  beforeEach(() => {
    sendContactMessage = {
      execute: jest.fn(),
    } as jest.Mocked<SendContactMessageUseCase>
    sendContactMessage.execute.mockResolvedValue({ messageId: 'm1' })
    ipHasher = {
      hash: jest.fn((ip: string | undefined) =>
        ip ? 'hashed-192.168.0.1' : null,
      ),
    }
    controller = new ContactController(sendContactMessage, ipHasher)
  })

  it('delega ao use case com campos normalizados (snake_case → use case)', async () => {
    const body: ContactDto = {
      message: 'Achei seu cachorro!',
      sender_name: 'Ana',
      sender_phone: '(21) 98888-7777',
      sender_email: 'ana@example.com',
      source: 'qr',
    }

    const result = await controller.send(
      '7F4K9M2Q',
      body,
      '192.168.0.1',
      'iPhone',
    )

    expect(result).toEqual({ messageId: 'm1' })
    expect(sendContactMessage.execute).toHaveBeenCalledWith({
      publicId: '7F4K9M2Q',
      senderName: 'Ana',
      senderPhone: '(21) 98888-7777',
      senderEmail: 'ana@example.com',
      message: 'Achei seu cachorro!',
      source: AccessSource.QR,
      ip: '192.168.0.1',
      ipHash: 'hashed-192.168.0.1',
      userAgent: 'iPhone',
    })
  })

  it('normaliza IP ausente → ipHash null e userAgent ausente → null', async () => {
    const body: ContactDto = { message: 'Oi', source: 'direct' }

    await controller.send('7F4K9M2Q', body, undefined, undefined)

    expect(sendContactMessage.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        source: AccessSource.DIRECT,
        ip: null,
        ipHash: null,
        userAgent: null,
        senderName: null,
        senderPhone: null,
        senderEmail: null,
      }),
    )
  })
})
