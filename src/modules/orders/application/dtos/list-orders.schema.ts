import { z } from 'zod'
import { ORDER_STATUS_VALUES } from '../../domain/value-objects/order-status.vo'

/**
 * Query params da listagem de pedidos (admin e "Meus pedidos").
 *
 * - `page`/`limit` → paginação.
 * - `status`   → filtro por status (enum `OrderStatus`).
 */
export const listOrdersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(ORDER_STATUS_VALUES).optional(),
})

export type ListOrdersDto = z.infer<typeof listOrdersSchema>
