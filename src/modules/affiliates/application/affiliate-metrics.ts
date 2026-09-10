/**
 * Métricas/KPIs de um afiliado, separadas por fonte de comissão.
 */
export interface AffiliateSourceMetrics {
  /** Quantidade de eventos comissionados (vendas ou ciclos pagos). */
  count: number
  /** Soma das bases de cálculo (receita atribuída). */
  revenueCents: number
  /** Soma das comissões geradas. */
  commissionCents: number
}

export interface AffiliateMetrics {
  /** Vendas de pingente comissionadas. */
  sales: AffiliateSourceMetrics
  /** Ciclos de assinatura comissionados. */
  subscriptions: AffiliateSourceMetrics
  /** Saldo disponível para saque (comissões AVAILABLE − saques ativos). */
  availableCents: number
  /** Total efetivamente pago (saques PAID). */
  withdrawnCents: number
}
