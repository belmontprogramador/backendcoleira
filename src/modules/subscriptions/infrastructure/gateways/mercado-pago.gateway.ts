import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { randomUUID } from 'node:crypto'
import { PaymentGatewayError } from '../../application/errors'
import type {
  CreatePaymentInput,
  CreatePaymentResult,
  GetPaymentResult,
  PaymentGatewayPort,
} from '../../domain/gateways/payment-gateway.port'
import type { PaymentMethod } from '../../domain/value-objects/payment-method.vo'
import type { PaymentStatus } from '../../domain/value-objects/payment-status.vo'

const MERCADO_PAGO_API = 'https://api.mercadopago.com'

interface MercadoPagoPaymentResponse {
  id?: number | string
  status?: string
  payment_method_id?: string
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string
      qr_code_base64?: string
    }
  }
  transaction_details?: {
    external_resource_url?: string
    barcode?: string
  }
  message?: string
}

function mapPaymentStatus(raw: string | undefined): PaymentStatus {
  switch (raw?.toLowerCase()) {
    case 'approved':
      return 'APPROVED'
    case 'rejected':
      return 'REJECTED'
    case 'refunded':
      return 'REFUNDED'
    case 'charged_back':
      return 'CHARGED_BACK'
    default:
      return 'PENDING'
  }
}

function mapPaymentMethod(raw: string | undefined): PaymentMethod {
  if (raw === 'pix') return 'PIX'
  if (raw === 'bolbradesco' || raw === 'pec') return 'BOLETO'
  return 'CARD'
}

/**
 * Implementação real do `PaymentGatewayPort` (Mercado Pago, checkout
 * transparente). Chama a API `POST /v1/payments` (PIX/boleto/cartão) e
 * `GET /v1/payments/{id}` (status no webhook) usando o Access Token de
 * produção. Não usa SDK — HTTP puro via `fetch`.
 */
@Injectable()
export class MercadoPagoGateway implements PaymentGatewayPort {
  private readonly logger = new Logger(MercadoPagoGateway.name)

  constructor(private readonly config: ConfigService) {}

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const payment = await this.request<MercadoPagoPaymentResponse>(
      '/v1/payments',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken()}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': randomUUID(),
        },
        body: JSON.stringify(this.buildPaymentBody(input)),
      },
    )

    const status = mapPaymentStatus(payment.status)
    return {
      providerPaymentId: String(payment.id),
      status,
      pixQrCode: payment.point_of_interaction?.transaction_data?.qr_code,
      pixQrCodeBase64:
        payment.point_of_interaction?.transaction_data?.qr_code_base64,
      boletoUrl: payment.transaction_details?.external_resource_url,
      boletoBarcode: payment.transaction_details?.barcode,
      cardApproved: status === 'APPROVED',
    }
  }

  async getPayment(id: string): Promise<GetPaymentResult> {
    const payment = await this.request<MercadoPagoPaymentResponse>(
      `/v1/payments/${id}`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${this.accessToken()}` },
      },
    )

    return {
      id: String(payment.id),
      status: mapPaymentStatus(payment.status),
      paymentMethod: mapPaymentMethod(payment.payment_method_id),
    }
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    let response: Response
    try {
      response = await fetch(`${MERCADO_PAGO_API}${path}`, init)
    } catch (error) {
      this.logger.error(`Mercado Pago ${path} erro de rede: ${String(error)}`)
      throw new PaymentGatewayError()
    }

    const body = (await response.json().catch(() => ({}))) as T

    if (!response.ok) {
      this.logger.error(
        `Mercado Pago ${path} falhou (${response.status}): ${JSON.stringify(body)}`,
      )
      throw new PaymentGatewayError()
    }

    return body
  }

  private accessToken(): string {
    const token = this.config.get<string>('MERCADO_PAGO_ACCESS_TOKEN')
    if (!token) {
      throw new PaymentGatewayError(
        'Gateway de pagamento não configurado (MERCADO_PAGO_ACCESS_TOKEN ausente)',
      )
    }
    return token
  }

  private buildPaymentBody(input: CreatePaymentInput): Record<string, unknown> {
    const payer: Record<string, unknown> = { email: input.payerEmail }
    if (input.payerIdentificationType && input.payerIdentificationNumber) {
      payer.identification = {
        type: input.payerIdentificationType,
        number: input.payerIdentificationNumber,
      }
    }
    if (input.payerFirstName) payer.first_name = input.payerFirstName
    if (input.payerLastName) payer.last_name = input.payerLastName

    const amount = Number((input.amountCents / 100).toFixed(2))

    if (input.method === 'PIX') {
      return {
        transaction_amount: amount,
        description: input.description,
        payment_method_id: 'pix',
        payer,
      }
    }

    if (input.method === 'BOLETO') {
      return {
        transaction_amount: amount,
        description: input.description,
        payment_method_id: 'bolbradesco',
        payer,
      }
    }

    return {
      transaction_amount: amount,
      description: input.description,
      token: input.cardToken,
      installments: input.cardInstallments ?? 1,
      payment_method_id: input.cardPaymentMethodId,
      issuer_id: input.cardIssuerId,
      payer,
    }
  }
}
