import { z } from 'zod'

/**
 * Status que o admin pode aplicar manualmente em `PATCH /admin/orders/:id/status`.
 * Exclui `PENDING`/`PAID`/`SHIPPED` (avançam por regra de negócio, não por ajuste).
 */
export const ADMIN_ORDER_STATUS_VALUES = [
  'DELIVERED',
  'CANCELLED',
  'REFUNDED',
] as const

export const adminUpdateOrderStatusSchema = z.object({
  status: z.enum(ADMIN_ORDER_STATUS_VALUES),
})

export type AdminUpdateOrderStatusDto = z.infer<
  typeof adminUpdateOrderStatusSchema
>
