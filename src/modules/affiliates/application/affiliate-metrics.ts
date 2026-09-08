/**
 * Métricas/KPIs de um afiliado (visíveis para o admin e para o próprio afiliado).
 */
export interface AffiliateMetrics {
  /** Vendas de pingente comissionadas. */
  salesCount: number
  /** Ciclos de assinatura comissionados. */
  subscriptionsCount: number
  /** Soma das bases de cálculo (receita atribuída). */
  revenueCents: number
  /** Soma das comissões (todas). */
  commissionTotalCents: number
  /** Saldo disponível para saque (comissões AVAILABLE − saques ativos). */
  availableCents: number
  /** Total efetivamente pago (saques PAID). */
  withdrawnCents: number
}
