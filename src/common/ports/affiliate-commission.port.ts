export interface AttributeOrderCommissionInput {
  orderId: string
  referralCode: string | null
  baseAmountCents: number
}

export interface AttributeSubscriptionCommissionInput {
  subscriptionId: string
  referralCode: string | null
  baseAmountCents: number
}

/**
 * Porta transversal de atribuição/estorno de comissão de afiliado.
 *
 * Consumida pelos módulos `orders` (venda paga → comissão) e `subscriptions`
 * (ciclo pago → comissão). A implementação vive no módulo `affiliates` e
 * resolve o afiliado pelo `referralCode`, calcula (snapshot) e persiste a
 * `Commission`. Os callers passam o `referralCode` e a base — nunca a entidade.
 */
export interface AffiliateCommissionPort {
  attributeOrder(input: AttributeOrderCommissionInput): Promise<void>
  attributeSubscription(
    input: AttributeSubscriptionCommissionInput,
  ): Promise<void>
  revokeOrder(orderId: string): Promise<void>
  revokeSubscription(subscriptionId: string): Promise<void>
}

export const AFFILIATE_COMMISSION_PORT = Symbol('AFFILIATE_COMMISSION_PORT')
