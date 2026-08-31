import { Injectable, Logger } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import type {
  CreatePaymentInput,
  CreatePaymentResult,
  GetPaymentResult,
  PaymentGatewayPort,
} from '../../domain/gateways/payment-gateway.port'

/**
 * Implementação mock do `PaymentGatewayPort` (desenvolvimento/teste).
 *
 * Simula o checkout transparente do Mercado Pago sem SDK real: gera um
 * `providerPaymentId` e retorna `PENDING` com os campos específicos de cada
 * meio de pagamento (PIX/boleto/cartão). Usado quando
 * `MERCADO_PAGO_ACCESS_TOKEN` não está definido.
 */
@Injectable()
export class MercadoPagoMockGateway implements PaymentGatewayPort {
  private readonly logger = new Logger(MercadoPagoMockGateway.name)

  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const providerPaymentId = `mock-${randomUUID()}`

    if (input.method === 'PIX') {
      this.logger.log(
        `[MercadoPago mock] PIX amount=${input.amountCents} payer=${input.payerEmail}`,
      )
      return Promise.resolve({
        providerPaymentId,
        status: 'PENDING',
        pixQrCode: '00020101021226880014br.gov.bcb.pix...mock',
        pixQrCodeBase64: 'aHR0cHM6Ly9tb2NrLXBpeC5wbmc=',
      })
    }

    if (input.method === 'BOLETO') {
      this.logger.log(
        `[MercadoPago mock] BOLETO amount=${input.amountCents} payer=${input.payerEmail}`,
      )
      return Promise.resolve({
        providerPaymentId,
        status: 'PENDING',
        boletoUrl: `https://mock-mercadopago/boleto/${providerPaymentId}`,
        boletoBarcode: `34191790010104351004791020150008${providerPaymentId.slice(-8)}`,
      })
    }

    this.logger.log(
      `[MercadoPago mock] CARD amount=${input.amountCents} payer=${input.payerEmail}`,
    )
    return Promise.resolve({
      providerPaymentId,
      status: 'PENDING',
      cardApproved: false,
    })
  }

  getPayment(id: string): Promise<GetPaymentResult> {
    // Simula a confirmação do pagamento no gateway mock.
    return Promise.resolve({ id, status: 'APPROVED', paymentMethod: 'PIX' })
  }
}
