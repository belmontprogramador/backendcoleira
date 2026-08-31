import { ConfigService } from '@nestjs/config'
import { MercadoPagoGateway } from '../mercado-pago.gateway'

interface PaymentBody {
  payment_method_id?: string
  transaction_amount?: number
  payer?: {
    email?: string
    identification?: { type?: string; number?: string }
  }
  token?: string
  installments?: number
  issuer_id?: string
}

describe('MercadoPagoGateway (real)', () => {
  let config: ConfigService
  let fetchMock: jest.Mock<Promise<Response>, [string, RequestInit]>

  const originalFetch = globalThis.fetch

  beforeEach(() => {
    config = {
      get: jest.fn((key: string) =>
        key === 'MERCADO_PAGO_ACCESS_TOKEN' ? 'APP_USR-test' : undefined,
      ),
    } as unknown as ConfigService
    fetchMock = jest.fn<Promise<Response>, [string, RequestInit]>()
    globalThis.fetch = fetchMock
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  function mockResponse(status: number, body: unknown) {
    return Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
    }) as Promise<Response>
  }

  it('PIX monta body, chama a API e mapeia qr_code', async () => {
    fetchMock.mockResolvedValue(
      mockResponse(201, {
        id: 12345,
        status: 'pending',
        payment_method_id: 'pix',
        point_of_interaction: {
          transaction_data: { qr_code: '000201...', qr_code_base64: 'b64' },
        },
      }),
    )

    const gateway = new MercadoPagoGateway(config)
    const result = await gateway.createPayment({
      amountCents: 1990,
      method: 'PIX',
      payerEmail: 'a@b.com',
      description: 'Assinatura Premium',
    })

    expect(result.providerPaymentId).toBe('12345')
    expect(result.status).toBe('PENDING')
    expect(result.pixQrCode).toBe('000201...')
    expect(result.pixQrCodeBase64).toBe('b64')

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.mercadopago.com/v1/payments')
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>).Authorization).toBe(
      'Bearer APP_USR-test',
    )
    const body = JSON.parse(init.body as string) as PaymentBody
    expect(body.payment_method_id).toBe('pix')
    expect(body.transaction_amount).toBe(19.9)
    expect(body.payer?.email).toBe('a@b.com')
  })

  it('BOLETO mapeia boletoUrl e boletoBarcode', async () => {
    fetchMock.mockResolvedValue(
      mockResponse(201, {
        id: 222,
        status: 'pending',
        payment_method_id: 'bolbradesco',
        transaction_details: {
          external_resource_url: 'https://boleto',
          barcode: '00190...',
        },
      }),
    )

    const gateway = new MercadoPagoGateway(config)
    const result = await gateway.createPayment({
      amountCents: 1990,
      method: 'BOLETO',
      payerEmail: 'a@b.com',
      description: 'Assinatura Premium',
      payerIdentificationType: 'CPF',
      payerIdentificationNumber: '12345678909',
    })

    expect(result.boletoUrl).toBe('https://boleto')
    expect(result.boletoBarcode).toBe('00190...')
    expect(result.status).toBe('PENDING')

    const [, init] = fetchMock.mock.calls[0]
    const body = JSON.parse(init.body as string) as PaymentBody
    expect(body.payment_method_id).toBe('bolbradesco')
    expect(body.payer?.identification?.number).toBe('12345678909')
  })

  it('CARD aprova e mapeia cardApproved=true', async () => {
    fetchMock.mockResolvedValue(
      mockResponse(201, {
        id: 333,
        status: 'approved',
        payment_method_id: 'visa',
      }),
    )

    const gateway = new MercadoPagoGateway(config)
    const result = await gateway.createPayment({
      amountCents: 1990,
      method: 'CARD',
      payerEmail: 'a@b.com',
      description: 'Assinatura Premium',
      cardToken: 'tok-1',
      cardPaymentMethodId: 'visa',
      cardInstallments: 3,
      cardIssuerId: '25',
      payerIdentificationType: 'CPF',
      payerIdentificationNumber: '12345678909',
    })

    expect(result.status).toBe('APPROVED')
    expect(result.cardApproved).toBe(true)
    expect(result.providerPaymentId).toBe('333')

    const [, init] = fetchMock.mock.calls[0]
    const body = JSON.parse(init.body as string) as PaymentBody
    expect(body.token).toBe('tok-1')
    expect(body.payment_method_id).toBe('visa')
    expect(body.installments).toBe(3)
    expect(body.issuer_id).toBe('25')
    expect(body.payer?.identification?.number).toBe('12345678909')
  })

  it('erro do Mercado Pago lança PaymentGatewayError', async () => {
    fetchMock.mockResolvedValue(mockResponse(400, { message: 'bad request' }))

    const gateway = new MercadoPagoGateway(config)
    await expect(
      gateway.createPayment({
        amountCents: 1990,
        method: 'PIX',
        payerEmail: 'a@b.com',
        description: 'x',
      }),
    ).rejects.toThrow('Falha na comunicação com o gateway de pagamento')
  })

  it('getPayment consulta o payment e mapeia status', async () => {
    fetchMock.mockResolvedValue(
      mockResponse(200, {
        id: '12345',
        status: 'approved',
        payment_method_id: 'pix',
      }),
    )

    const gateway = new MercadoPagoGateway(config)
    const result = await gateway.getPayment('12345')

    expect(result.id).toBe('12345')
    expect(result.status).toBe('APPROVED')
    expect(result.paymentMethod).toBe('PIX')

    const [url] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.mercadopago.com/v1/payments/12345')
  })
})
