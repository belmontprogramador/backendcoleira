export const SUBSCRIPTION_STATUS_VALUES = [
  'TRIALING',
  'ACTIVE',
  'PAST_DUE',
  'CANCELLED',
  'EXPIRED',
] as const

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUS_VALUES)[number]

/**
 * Ciclo de vida da assinatura (espelha o enum `SubscriptionStatus` do Prisma).
 */
export function isSubscriptionStatus(
  value: string,
): value is SubscriptionStatus {
  return (SUBSCRIPTION_STATUS_VALUES as readonly string[]).includes(value)
}
