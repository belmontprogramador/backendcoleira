export const AFFILIATE_STATUS_VALUES = ['ACTIVE', 'INACTIVE'] as const

export type AffiliateStatus = (typeof AFFILIATE_STATUS_VALUES)[number]

/**
 * Estado de um afiliado. Apenas `ACTIVE` pode receber novas comissões;
 * `INACTIVE` preserva histórico/saldo mas não atribui novas vendas.
 */
export function isAffiliateStatus(value: string): value is AffiliateStatus {
  return (AFFILIATE_STATUS_VALUES as readonly string[]).includes(value)
}
