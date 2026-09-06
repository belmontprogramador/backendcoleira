import {
  MelhorEnvioApiError,
  MelhorEnvioClient,
  MelhorEnvioNotConfiguredError,
} from '../melhor-envio.client'

const fetchMock = jest.fn()

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Response
}

function makeClient(overrides: Partial<ConstructorParameters<typeof MelhorEnvioClient>[0]> = {}) {
  return new MelhorEnvioClient({
    baseUrl: 'https://sandbox.melhorenvio.com.br',
    clientId: 'client-id',
    clientSecret: 'client-secret',
    redirectUri: 'https://elopet.online/callback',
    userAgent: 'Elopet (contato@elopet.online)',
    ...overrides,
  })
}

describe('MelhorEnvioClient', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    global.fetch = fetchMock as unknown as typeof fetch
  })

  describe('isConfigured', () => {
    it('exige baseUrl + clientId + clientSecret', () => {
      expect(makeClient().isConfigured()).toBe(true)
      expect(makeClient({ baseUrl: '' }).isConfigured()).toBe(false)
      expect(makeClient({ clientId: '' }).isConfigured()).toBe(false)
      expect(makeClient({ clientSecret: '' }).isConfigured()).toBe(false)
    })
  })

  describe('buildAuthorizeUrl', () => {
    it('monta a URL de autorização com client_id + redirect_uri', () => {
      const url = makeClient().buildAuthorizeUrl('st-1')
      expect(url).toContain('https://sandbox.melhorenvio.com.br/oauth/authorize?')
      expect(url).toContain('client_id=client-id')
      expect(url).toContain('redirect_uri=https%3A%2F%2Felopet.online%2Fcallback')
      expect(url).toContain('response_type=code')
      expect(url).toContain('state=st-1')
    })

    it('retorna null quando não configurada', () => {
      expect(makeClient({ baseUrl: '' }).buildAuthorizeUrl()).toBeNull()
    })
  })

  describe('OAuth', () => {
    it('troca o code por token (authorization_code)', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({
          access_token: 'at-1',
          refresh_token: 'rt-1',
          token_type: 'Bearer',
          expires_in: 2592000,
        }),
      )

      const result = await makeClient().exchangeAuthorizationCode('code-123')

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
      expect(url).toBe(
        'https://sandbox.melhorenvio.com.br/oauth/token',
      )
      expect(init.method).toBe('POST')
      expect(init.headers).toEqual(
        expect.objectContaining({
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Elopet (contato@elopet.online)',
        }),
      )
      const body = new URLSearchParams(String(init.body))
      expect(body.get('grant_type')).toBe('authorization_code')
      expect(body.get('code')).toBe('code-123')
      expect(body.get('client_id')).toBe('client-id')
      expect(body.get('redirect_uri')).toBe(
        'https://elopet.online/callback',
      )
      expect(result).toEqual({
        access_token: 'at-1',
        refresh_token: 'rt-1',
        token_type: 'Bearer',
        expires_in: 2592000,
      })
    })

    it('renova o token (refresh_token)', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({ access_token: 'at-2', refresh_token: 'rt-2' }),
      )

      await makeClient().refreshAccessToken('rt-1')

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
      expect(url).toBe(
        'https://sandbox.melhorenvio.com.br/oauth/token',
      )
      const body = new URLSearchParams(String(init.body))
      expect(body.get('grant_type')).toBe('refresh_token')
      expect(body.get('refresh_token')).toBe('rt-1')
    })
  })

  describe('calculateShipping', () => {
    it('envia payload e Authorization Bearer', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse([
          {
            id: 1,
            name: 'PAC',
            price: '18.60',
            custom_price: '18.60',
            discount: '4.16',
            currency: 'R$',
            delivery_time: 6,
            custom_delivery_time: 6,
            company: { id: 1, name: 'Correios', picture: 'x' },
          },
        ]),
      )

      const input = {
        from: { postal_code: '96020360' },
        to: { postal_code: '01018020' },
        products: [
          {
            id: 'A',
            width: 11,
            height: 17,
            length: 11,
            weight: 1,
            insurance_value: 10.1,
            quantity: 1,
          },
        ],
        services: '1,2',
      }

      const result = await makeClient().calculateShipping(input, 'at-1')

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
      expect(url).toBe(
        'https://sandbox.melhorenvio.com.br/api/v2/me/shipment/calculate',
      )
      expect(init.headers).toEqual(
        expect.objectContaining({
          Authorization: 'Bearer at-1',
          'User-Agent': 'Elopet (contato@elopet.online)',
        }),
      )
      expect(JSON.parse(String(init.body))).toEqual(input)
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('PAC')
    })
  })

  describe('trackOrders', () => {
    it('consulta rastreio por ids', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({ '123': { id: '123', protocol: 'P1', status: 'posted' } }),
      )

      const result = await makeClient().trackOrders(['123'], 'at-1')

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
      expect(url).toBe(
        'https://sandbox.melhorenvio.com.br/api/v2/me/shipment/tracking',
      )
      expect(JSON.parse(String(init.body))).toEqual({ orders: ['123'] })
      expect(result['123'].status).toBe('posted')
    })
  })

  describe('pipeline de despacho', () => {
    it('addToCart envia o carrinho', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ id: 'o1', protocol: 'P1' }))
      const input = {
        service: 1,
        from: {
          name: 'A',
          phone: '1',
          email: 'a@b.c',
          postal_code: 'x',
          address: 'r',
          city: 'c',
          state_abbr: 'SP',
        },
        to: {
          name: 'B',
          phone: '2',
          email: 'b@c.d',
          postal_code: 'y',
          address: 'r2',
          city: 'c2',
          state_abbr: 'RJ',
        },
      }

      const result = await makeClient().addToCart(input, 'at')

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
      expect(url).toContain('/api/v2/me/cart')
      expect(JSON.parse(String(init.body))).toEqual(input)
      expect(result).toEqual({ id: 'o1', protocol: 'P1' })
    })

    it('checkout envia orders', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ purchase: {}, orders: [] }))
      await makeClient().checkout(['o1'], 'at')
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
      expect(url).toContain('/api/v2/me/shipment/checkout')
      expect(JSON.parse(String(init.body))).toEqual({ orders: ['o1'] })
    })

    it('generateLabels envia orders', async () => {
      fetchMock.mockResolvedValue(jsonResponse({}))
      await makeClient().generateLabels(['o1'], 'at')
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
      expect(url).toContain('/api/v2/me/shipment/generate')
      expect(JSON.parse(String(init.body))).toEqual({ orders: ['o1'] })
    })

    it('printLabels envia mode + orders e devolve url', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ url: 'https://print/x' }))
      const result = await makeClient().printLabels('private', ['o1'], 'at')
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
      expect(url).toContain('/api/v2/me/shipment/print')
      expect(JSON.parse(String(init.body))).toEqual({
        mode: 'private',
        orders: ['o1'],
      })
      expect(result.url).toBe('https://print/x')
    })
  })

  describe('erros', () => {
    it('lança MelhorEnvioNotConfiguredError sem configurar', async () => {
      const client = makeClient({ baseUrl: '' })
      await expect(
        client.calculateShipping(
          { from: { postal_code: 'x' }, to: { postal_code: 'y' } },
          'at',
        ),
      ).rejects.toThrow(MelhorEnvioNotConfiguredError)
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('lança MelhorEnvioApiError com status em resposta não-2xx', async () => {
      fetchMock.mockResolvedValue(jsonResponse({}, false, 401))

      await expect(
        makeClient().calculateShipping(
          { from: { postal_code: 'x' }, to: { postal_code: 'y' } },
          'at',
        ),
      ).rejects.toThrow(MelhorEnvioApiError)

      const error = await makeClient()
        .calculateShipping(
          { from: { postal_code: 'x' }, to: { postal_code: 'y' } },
          'at',
        )
        .catch((e) => e)
      expect(error.status).toBe(401)
    })

    it('lança MelhorEnvioApiError em falha de rede', async () => {
      fetchMock.mockRejectedValue(new Error('ECONNREFUSED'))
      await expect(
        makeClient().calculateShipping(
          { from: { postal_code: 'x' }, to: { postal_code: 'y' } },
          'at',
        ),
      ).rejects.toThrow(MelhorEnvioApiError)
    })
  })
})
