import { ServiceUnavailableException } from '@nestjs/common'
import { WhatsAppAdminController } from '../whatsapp-admin.controller'
import type { WhatsAppConnectionService } from '../whatsapp-connection.service'

describe('WhatsAppAdminController', () => {
  const connection = {
    isConfigured: jest.fn(),
    state: jest.fn(),
    connect: jest.fn(),
  } as unknown as WhatsAppConnectionService

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('connectionState devolve state + instanceName', async () => {
    ;(connection.isConfigured as jest.Mock).mockReturnValue(true)
    ;(connection.state as jest.Mock).mockResolvedValue({
      state: 'open',
      instanceName: 'elopet',
    })
    const controller = new WhatsAppAdminController(connection)

    await expect(controller.connectionState()).resolves.toEqual({
      state: 'open',
      instanceName: 'elopet',
    })
  })

  it('connect devolve QR + instanceName', async () => {
    ;(connection.isConfigured as jest.Mock).mockReturnValue(true)
    ;(connection.connect as jest.Mock).mockResolvedValue({
      base64: 'iVBOR',
      pairingCode: 'ABC',
      instanceName: 'elopet',
    })
    const controller = new WhatsAppAdminController(connection)

    await expect(controller.connect()).resolves.toEqual({
      base64: 'iVBOR',
      pairingCode: 'ABC',
      instanceName: 'elopet',
    })
  })

  it('lança 503 quando não configurado (sem chamar o serviço)', async () => {
    ;(connection.isConfigured as jest.Mock).mockReturnValue(false)
    const controller = new WhatsAppAdminController(connection)

    await expect(controller.connectionState()).rejects.toThrow(
      ServiceUnavailableException,
    )
    await expect(controller.connect()).rejects.toThrow(
      ServiceUnavailableException,
    )
    expect(connection.state).not.toHaveBeenCalled()
    expect(connection.connect).not.toHaveBeenCalled()
  })
})
