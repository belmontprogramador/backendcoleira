export const WEBHOOK_STATUS_VALUES = [
  'RECEIVED',
  'PROCESSED',
  'FAILED',
  'DUPLICATE',
] as const

export type WebhookStatus = (typeof WEBHOOK_STATUS_VALUES)[number]

/**
 * Estado de processamento de um webhook (espelha o enum `WebhookStatus`).
 */
export function isWebhookStatus(value: string): value is WebhookStatus {
  return (WEBHOOK_STATUS_VALUES as readonly string[]).includes(value)
}
