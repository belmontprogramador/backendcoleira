import type { PaymentMethod } from '../value-objects/payment-method.vo'
import type { PaymentStatus } from '../value-objects/payment-status.vo'

export interface CreatePaymentInput {
  amountCents: number
  method: PaymentMethod
  payerEmail: string
  description: string
  /** Cartão: token gerado no front pelo MercadoPago.js (Secure Fields). */
  cardToken?: string
  /** Cartão: bandeira (visa, master, amex, elo, hipercard...). */
  cardPaymentMethodId?: string
  /** Cartão: número de parcelas (1..12). */
  cardInstallments?: number
  /** Cartão: banco emissor (id do issuer). */
  cardIssuerId?: string
  /** Documento do pagador (obrigatório para boleto/cartão no MP). */
  payerIdentificationType?: string
  payerIdentificationNumber?: string
  payerFirstName?: string
  payerLastName?: string
}

export interface CreatePaymentResult {
  providerPaymentId: string
  status: PaymentStatus
  /** PIX */
  pixQrCode?: string
  pixQrCodeBase64?: string
  /** BOLETO */
  boletoUrl?: string
  boletoBarcode?: string
  /** CARTÃO */
  cardApproved?: boolean
}

export interface GetPaymentResult {
  id: string
  status: PaymentStatus
  paymentMethod: PaymentMethod
}

/**
 * Porta do gateway de pagamento (checkout próprio transparente — modelo B).
 * O gateway só cobra avulso e notifica via webhook; a recorrência é nossa.
 * `getPayment` resolve o status real do pagamento — o payload da notificação
 * do Mercado Pago NÃO embute o `status`, então o webhook consulta o gateway.
 */
export interface PaymentGatewayPort {
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>
  getPayment(id: string): Promise<GetPaymentResult>
}

export const PAYMENT_GATEWAY_PORT = Symbol('PAYMENT_GATEWAY_PORT')
