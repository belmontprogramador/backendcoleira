import type { PaymentMethod } from '../value-objects/payment-method.vo'
import type { PaymentStatus } from '../value-objects/payment-status.vo'

export interface CreatePaymentInput {
  amountCents: number
  method: PaymentMethod
  payerEmail: string
  description: string
  cardToken?: string
}

export interface CreatePaymentResult {
  providerPaymentId: string
  status: PaymentStatus
  pixQrCode?: string
  pixQrCodeBase64?: string
  boletoUrl?: string
  cardApproved?: boolean
}

/**
 * Porta do gateway de pagamento (checkout próprio transparente — modelo B).
 * O gateway só cobra avulso e notifica via webhook; a recorrência é nossa.
 * Implementação real (SDK do Mercado Pago) entra plugável na Fase 10; agora
 * há apenas o mock de dev.
 */
export interface PaymentGatewayPort {
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>
}

export const PAYMENT_GATEWAY_PORT = Symbol('PAYMENT_GATEWAY_PORT')
