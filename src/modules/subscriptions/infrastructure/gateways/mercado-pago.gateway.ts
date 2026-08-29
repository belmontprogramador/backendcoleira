import { Injectable, Logger } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentGatewayPort,
} from '../../domain/gateways/payment-gateway.port'

/**
 * Implementação mock do `PaymentGatewayPort` (desenvolvimento).
 *
 * Simula o checkout transparente do Mercado Pago sem SDK real: gera um
 * `providerPaymentId` e retorna `PENDING` com os campos específicos de cada
 * meio de pagamento (PIX/boleto/cartão). A confirmação real chega via webhook
 * (7.5). Em produção, trocar pelo SDK real — a porta permanece.
 */
@Injectable()
export class MercadoPagoGateway implements PaymentGatewayPort {
  private readonly logger = new Logger(MercadoPagoGateway.name)

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
      })
    }

    this.logger.log(
      `[MercadoPago mock] CARD amount=${input.amountCents} payer=${input.payerEmail} token=${input.cardToken ?? ''}`,
    )
    return Promise.resolve({
      providerPaymentId,
      status: 'PENDING',
      cardApproved: false,
    })
  }
}
