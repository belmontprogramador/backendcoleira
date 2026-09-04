import { EvolutionWhatsAppSender } from '../evolution-whatsapp.sender'
import type { EvolutionApiClient } from '../evolution-api.client'

describe('EvolutionWhatsAppSender', () => {
  const client = {
    sendText: jest.fn(),
  } as unknown as EvolutionApiClient

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('envia número normalizado (sem +)', async () => {
    const sender = new EvolutionWhatsAppSender(client, 'elopet')

    await sender.sendContactMessage('(11) 99999-9999', 'Olá!')

    expect(client.sendText).toHaveBeenCalledWith(
      'elopet',
      '5511999999999',
      'Olá!',
    )
  })

  it('envia E.164 já normalizado (identidade)', async () => {
    const sender = new EvolutionWhatsAppSender(client, 'elopet')

    await sender.sendContactMessage('+5521999999999', 'Olá!')

    expect(client.sendText).toHaveBeenCalledWith(
      'elopet',
      '5521999999999',
      'Olá!',
    )
  })

  it('pula fixo (retorna sem enviar)', async () => {
    const sender = new EvolutionWhatsAppSender(client, 'elopet')

    await sender.sendContactMessage('(11) 9999-9999', 'Olá!')

    expect(client.sendText).not.toHaveBeenCalled()
  })

  it('pula vazio/inválido', async () => {
    const sender = new EvolutionWhatsAppSender(client, 'elopet')

    await sender.sendContactMessage('', 'Olá!')
    await sender.sendContactMessage('123', 'Olá!')

    expect(client.sendText).not.toHaveBeenCalled()
  })

  it('não derruba em erro de rede (best-effort)', async () => {
    client.sendText.mockRejectedValue(new Error('ECONNREFUSED'))
    const sender = new EvolutionWhatsAppSender(client, 'elopet')

    await expect(
      sender.sendContactMessage('+5511999999999', 'Olá!'),
    ).resolves.toBeUndefined()
  })
})
