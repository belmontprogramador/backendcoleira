import {
  EvolutionApiClient,
  EvolutionApiError,
  EvolutionNotConfiguredError,
} from '../evolution-api.client'

const fetchMock = jest.fn()

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Response
}

describe('EvolutionApiClient', () => {
  const baseUrl = 'http://evolution:8080'
  const apiKey = 'secret'

  beforeEach(() => {
    fetchMock.mockReset()
    global.fetch = fetchMock as unknown as typeof fetch
  })

  describe('isConfigured', () => {
    it('exige url E chave', () => {
      expect(new EvolutionApiClient('', '').isConfigured()).toBe(false)
      expect(new EvolutionApiClient(baseUrl, '').isConfigured()).toBe(false)
      expect(new EvolutionApiClient('', apiKey).isConfigured()).toBe(false)
      expect(new EvolutionApiClient(baseUrl, apiKey).isConfigured()).toBe(true)
    })

    it('ignora barra final na url', () => {
      const client = new EvolutionApiClient(`${baseUrl}/`, apiKey)
      expect(client.isConfigured()).toBe(true)
    })
  })

  describe('createInstance', () => {
    it('POST correto com apikey + body WHATSAPP-BAILEYS', async () => {
      fetchMock.mockResolvedValue(jsonResponse({}))
      const client = new EvolutionApiClient(baseUrl, apiKey)

      await client.createInstance('elopet')

      expect(fetchMock).toHaveBeenCalledWith(
        'http://evolution:8080/instance/create',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ apikey: 'secret' }),
        }),
      )
      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
      expect(JSON.parse(String(init.body))).toEqual({
        instanceName: 'elopet',
        integration: 'WHATSAPP-BAILEYS',
        qrcode: true,
      })
    })
  })

  describe('connect', () => {
    it('GET retorna o QR (pairingCode/base64/count)', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({ pairingCode: 'ABC123', base64: 'iVBOR', count: 1 }),
      )
      const client = new EvolutionApiClient(baseUrl, apiKey)

      const result = await client.connect('elopet')

      expect(fetchMock).toHaveBeenCalledWith(
        'http://evolution:8080/instance/connect/elopet',
        expect.objectContaining({ method: 'GET' }),
      )
      expect(result).toEqual({ pairingCode: 'ABC123', base64: 'iVBOR', count: 1 })
    })
  })

  describe('connectionState', () => {
    it('mapeia o state do instance.state', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ instance: { state: 'open' } }))
      const client = new EvolutionApiClient(baseUrl, apiKey)

      await expect(client.connectionState('elopet')).resolves.toBe('open')
    })

    it('retorna unknown quando não há state', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ instance: {} }))
      const client = new EvolutionApiClient(baseUrl, apiKey)

      await expect(client.connectionState('elopet')).resolves.toBe('unknown')
    })

    it('retorna "close" quando a instância ainda não existe (404)', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(
          {
            status: 404,
            error: 'Not Found',
            response: { message: ['The "elopet" instance does not exist'] },
          },
          false,
          404,
        ),
      )
      const client = new EvolutionApiClient(baseUrl, apiKey)

      await expect(client.connectionState('elopet')).resolves.toBe('close')
    })
  })

  describe('sendText', () => {
    it('POST correto com number/text', async () => {
      fetchMock.mockResolvedValue(jsonResponse({}))
      const client = new EvolutionApiClient(baseUrl, apiKey)

      await client.sendText('elopet', '5511999999999', 'Olá!')

      expect(fetchMock).toHaveBeenCalledWith(
        'http://evolution:8080/message/sendText/elopet',
        expect.objectContaining({ method: 'POST' }),
      )
      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
      expect(JSON.parse(String(init.body))).toEqual({
        number: '5511999999999',
        text: 'Olá!',
      })
    })
  })

  describe('erros', () => {
    it('lança EvolutionApiError em não-ok, com status', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ error: 'x' }, false, 500))
      const client = new EvolutionApiClient(baseUrl, apiKey)

      const error = await client.connect('elopet').catch((e: unknown) => e)
      expect(error).toBeInstanceOf(EvolutionApiError)
      expect((error as EvolutionApiError).status).toBe(500)
    })

    it('lança EvolutionApiError em falha de rede', async () => {
      fetchMock.mockRejectedValue(new Error('ECONNREFUSED'))
      const client = new EvolutionApiClient(baseUrl, apiKey)

      await expect(client.connect('elopet')).rejects.toThrow(EvolutionApiError)
    })

    it('lança EvolutionNotConfiguredError sem configurar', async () => {
      const client = new EvolutionApiClient('', '')

      await expect(client.sendText('elopet', '1', 'x')).rejects.toThrow(
        EvolutionNotConfiguredError,
      )
      expect(fetchMock).not.toHaveBeenCalled()
    })
  })
})
