import { z } from 'zod'
import { SUBSCRIPTION_STATUS_VALUES } from '../../domain/value-objects/subscription-status.vo'

/**
 * Query params da listagem administrativa de assinaturas.
 *
 * - `status`   → filtra por status da assinatura (enum `SubscriptionStatus`).
 * - `planCode` → filtra por código do plano (ex.: `PREMIUM`).
 * - `userId`   → filtra por dono (id do usuário).
 */
export const listSubscriptionsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(SUBSCRIPTION_STATUS_VALUES).optional(),
  planCode: z.string().trim().min(1).optional(),
  userId: z.string().trim().min(1).optional(),
})

export type ListSubscriptionsDto = z.infer<typeof listSubscriptionsSchema>
