import { MercadoPagoGateway } from '../mercado-pago.gateway'

describe('MercadoPagoGateway (mock dev)', () => {
  const gateway = new MercadoPagoGateway()

  it('PIX retorna qr_code e status PENDING', async () => {
    const result = await gateway.createPayment({
      amountCents: 1990,
      method: 'PIX',
      payerEmail: 'owner@email.com',
      description: 'Assinatura Premium',
    })

    expect(result.status).toBe('PENDING')
    expect(result.providerPaymentId).toBeTruthy()
    expect(result.pixQrCode).toBeTruthy()
    expect(result.pixQrCodeBase64).toBeTruthy()
    expect(result.boletoUrl).toBeUndefined()
  })

  it('BOLETO retorna boletoUrl e status PENDING', async () => {
    const result = await gateway.createPayment({
      amountCents: 1990,
      method: 'BOLETO',
      payerEmail: 'owner@email.com',
      description: 'Assinatura Premium',
    })

    expect(result.status).toBe('PENDING')
    expect(result.providerPaymentId).toBeTruthy()
    expect(result.boletoUrl).toBeTruthy()
    expect(result.pixQrCode).toBeUndefined()
  })

  it('CARD retorna cardApproved false e status PENDING', async () => {
    const result = await gateway.createPayment({
      amountCents: 1990,
      method: 'CARD',
      payerEmail: 'owner@email.com',
      description: 'Assinatura Premium',
      cardToken: 'token-123',
    })

    expect(result.status).toBe('PENDING')
    expect(result.providerPaymentId).toBeTruthy()
    expect(result.cardApproved).toBe(false)
  })
})
