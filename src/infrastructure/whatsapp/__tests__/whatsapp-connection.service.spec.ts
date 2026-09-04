import { WhatsAppConnectionService } from '../whatsapp-connection.service'
import type { EvolutionApiClient } from '../evolution-api.client'

describe('WhatsAppConnectionService', () => {
  const config = { get: jest.fn() }
  const client = {
    isConfigured: jest.fn(),
    createInstance: jest.fn(),
    connect: jest.fn(),
    connectionState: jest.fn(),
  } as unknown as EvolutionApiClient

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('isConfigured delega ao client', () => {
    ;(client.isConfigured as jest.Mock).mockReturnValue(true)
    const svc = new WhatsAppConnectionService(client, config as never)

    expect(svc.isConfigured()).toBe(true)
  })

  it('instanceName usa default "elopet" quando ausente', () => {
    config.get.mockReturnValue(undefined)
    const svc = new WhatsAppConnectionService(client, config as never)

    expect(svc.instanceName()).toBe('elopet')
  })

  it('connect cria instância (best-effort) e devolve QR + instanceName', async () => {
    config.get.mockReturnValue('elopet')
    ;(client.createInstance as jest.Mock).mockResolvedValue(undefined)
    ;(client.connect as jest.Mock).mockResolvedValue({
      pairingCode: 'ABC',
      base64: 'iVBOR',
      count: 1,
    })
    const svc = new WhatsAppConnectionService(client, config as never)

    const result = await svc.connect()

    expect(client.createInstance).toHaveBeenCalledWith('elopet')
    expect(client.connect).toHaveBeenCalledWith('elopet')
    expect(result).toEqual({
      pairingCode: 'ABC',
      base64: 'iVBOR',
      count: 1,
      instanceName: 'elopet',
    })
  })

  it('connect prossegue se createInstance falhar (reconexão)', async () => {
    config.get.mockReturnValue('elopet')
    ;(client.createInstance as jest.Mock).mockRejectedValue(
      new Error('already exists'),
    )
    ;(client.connect as jest.Mock).mockResolvedValue({ base64: 'iVBOR' })
    const svc = new WhatsAppConnectionService(client, config as never)

    const result = await svc.connect()

    expect(result).toEqual({ base64: 'iVBOR', instanceName: 'elopet' })
  })

  it('state devolve state + instanceName', async () => {
    config.get.mockReturnValue('elopet')
    ;(client.connectionState as jest.Mock).mockResolvedValue('open')
    const svc = new WhatsAppConnectionService(client, config as never)

    await expect(svc.state()).resolves.toEqual({
      state: 'open',
      instanceName: 'elopet',
    })
  })
})
