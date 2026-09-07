import { ShippingGatewayError } from '../../../common/errors/shipping-gateway.error'
import { MelhorEnvioApiError } from '../melhor-envio.client'
import { MelhorEnvioGateway } from '../melhor-envio.gateway'
import type { ShippingTokenStorePort } from '../shipping-token-store.port'

function makeGateway(
  client: Partial<MelhorEnvioGateway['client']>,
  tokenStore: Partial<ShippingTokenStorePort>,
): MelhorEnvioGateway {
  return new MelhorEnvioGateway(
    client as MelhorEnvioGateway['client'],
    tokenStore as ShippingTokenStorePort,
  )
}

const credential = {
  accessToken: 'at-1',
  refreshToken: 'rt-1',
  expiresAt: new Date(),
}

describe('MelhorEnvioGateway', () => {
  describe('calculateQuote', () => {
    it('lê o token e mapeia preço (string → centavos) e snake_case → camelCase', async () => {
      const client = {
        calculateShipping: jest.fn().mockResolvedValue([
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
      }
      const tokenStore = { get: jest.fn().mockResolvedValue(credential), save: jest.fn() }

      const gateway = makeGateway(client, tokenStore)
      const quotes = await gateway.calculateQuote({
        fromPostalCode: '96020360',
        toPostalCode: '01018020',
        products: [
          {
            id: 'A',
            width: 11,
            height: 17,
            length: 11,
            weight: 1,
            insuranceValue: 10.1,
            quantity: 1,
          },
        ],
      })

      expect(quotes[0]).toEqual({
        id: 1,
        name: 'PAC',
        priceCents: 1860,
        customPriceCents: 1860,
        discountCents: 416,
        currency: 'R$',
        deliveryTime: 6,
        customDeliveryTime: 6,
        company: { id: 1, name: 'Correios', picture: 'x' },
      })
      expect(client.calculateShipping).toHaveBeenCalledWith(
        expect.objectContaining({
          from: { postal_code: '96020360' },
          to: { postal_code: '01018020' },
          products: [
            expect.objectContaining({ insurance_value: 10.1 }),
          ],
        }),
        'at-1',
      )
    })

    it('filtra quotes sem preco (transportadora nao cotou)', async () => {
      const client = {
        calculateShipping: jest.fn().mockResolvedValue([
          {
            id: 3,
            name: '.Package',
            price: null,
            custom_price: null,
            discount: null,
            currency: null,
            delivery_time: null,
            custom_delivery_time: null,
            company: { id: 2, name: 'Jadlog', picture: 'x' },
          },
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
      }
      const tokenStore = {
        get: jest.fn().mockResolvedValue(credential),
        save: jest.fn(),
      }

      const gateway = makeGateway(client, tokenStore)
      const quotes = await gateway.calculateQuote({
        fromPostalCode: 'x',
        toPostalCode: 'y',
      })

      expect(quotes).toHaveLength(1)
      expect(quotes[0]).toEqual(
        expect.objectContaining({ id: 1, name: 'PAC', priceCents: 1860 }),
      )
    })
  })

  describe('createShipment', () => {
    it('mapeia o resultado para orderId/protocol', async () => {
      const client = {
        addToCart: jest.fn().mockResolvedValue({ id: 'o1', protocol: 'P1' }),
      }
      const tokenStore = { get: jest.fn().mockResolvedValue(credential), save: jest.fn() }

      const gateway = makeGateway(client, tokenStore)
      const result = await gateway.createShipment({
        service: 1,
        from: {
          name: 'Elopet',
          phone: '1',
          email: 'a@b.c',
          postalCode: '01310100',
          address: 'Av. Paulista, 1000',
          city: 'São Paulo',
          stateAbbr: 'SP',
        },
        to: {
          name: 'Fulano',
          phone: '2',
          email: 'b@c.d',
          postalCode: '96020360',
          address: 'Rua X',
          city: 'Pelotas',
          stateAbbr: 'RS',
        },
      })

      expect(result).toEqual({ orderId: 'o1', protocol: 'P1' })
      expect(client.addToCart).toHaveBeenCalledWith(
        expect.objectContaining({
          service: 1,
          from: expect.objectContaining({ postal_code: '01310100', state_abbr: 'SP' }),
          to: expect.objectContaining({ postal_code: '96020360', state_abbr: 'RS' }),
        }),
        'at-1',
      )
    })
  })

  describe('printLabel', () => {
    it('devolve a url', async () => {
      const client = {
        printLabels: jest.fn().mockResolvedValue({ url: 'https://print/x' }),
      }
      const tokenStore = { get: jest.fn().mockResolvedValue(credential), save: jest.fn() }

      const gateway = makeGateway(client, tokenStore)
      expect(await gateway.printLabel('private', ['o1'])).toBe('https://print/x')
    })
  })

  describe('track', () => {
    it('mapeia tracking snake_case → camelCase', async () => {
      const client = {
        trackOrders: jest.fn().mockResolvedValue({
          'o1': {
            id: 'o1',
            protocol: 'P1',
            status: 'posted',
            tracking: 'BR123',
            melhorenvio_tracking: 'me-123',
            created_at: '2026-01-01',
            paid_at: null,
            generated_at: null,
            posted_at: '2026-01-02',
            delivered_at: null,
            canceled_at: null,
            expired_at: null,
          },
        }),
      }
      const tokenStore = { get: jest.fn().mockResolvedValue(credential), save: jest.fn() }

      const gateway = makeGateway(client, tokenStore)
      const result = await gateway.track(['o1'])
      expect(result['o1']).toEqual(
        expect.objectContaining({
          melhorenvioTracking: 'me-123',
          postedAt: '2026-01-02',
        }),
      )
    })
  })

  describe('token / 401', () => {
    it('renova o token em 401 e re-tenta uma vez', async () => {
      const calculateShipping = jest
        .fn()
        .mockRejectedValueOnce(new MelhorEnvioApiError('401', 401))
        .mockResolvedValueOnce([
          {
            id: 1,
            name: 'PAC',
            price: '0',
            custom_price: '0',
            discount: '0',
            currency: 'R$',
            delivery_time: 1,
            custom_delivery_time: 1,
            company: { id: 1, name: 'C', picture: '' },
          },
        ])
      const client = {
        calculateShipping,
        refreshAccessToken: jest.fn().mockResolvedValue({
          access_token: 'at-2',
          refresh_token: 'rt-2',
          expires_in: 2592000,
        }),
      }
      let stored = credential
      const tokenStore = {
        get: jest.fn().mockImplementation(() => Promise.resolve(stored)),
        save: jest.fn().mockImplementation((c) => {
          stored = c
          return Promise.resolve()
        }),
      }

      const gateway = makeGateway(client, tokenStore)
      await gateway.calculateQuote({ fromPostalCode: 'x', toPostalCode: 'y' })

      expect(client.refreshAccessToken).toHaveBeenCalledWith('rt-1')
      expect(tokenStore.save).toHaveBeenCalledWith(
        expect.objectContaining({ accessToken: 'at-2', refreshToken: 'rt-2' }),
      )
      expect(calculateShipping).toHaveBeenCalledTimes(2)
      expect(calculateShipping).toHaveBeenLastCalledWith(
        expect.anything(),
        'at-2',
      )
    })

    it('lança ShippingGatewayError sem credencial', async () => {
      const gateway = makeGateway({}, { get: jest.fn().mockResolvedValue(null) })
      await expect(
        gateway.calculateQuote({ fromPostalCode: 'x', toPostalCode: 'y' }),
      ).rejects.toThrow(ShippingGatewayError)
    })

    it('lança ShippingGatewayError em erro não-401', async () => {
      const client = {
        calculateShipping: jest
          .fn()
          .mockRejectedValue(new MelhorEnvioApiError('erro', 422)),
      }
      const tokenStore = { get: jest.fn().mockResolvedValue(credential), save: jest.fn() }

      const gateway = makeGateway(client, tokenStore)
      await expect(
        gateway.calculateQuote({ fromPostalCode: 'x', toPostalCode: 'y' }),
      ).rejects.toThrow(ShippingGatewayError)
    })
  })
})
