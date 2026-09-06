import { z } from 'zod'

/**
 * DTO da cotação de frete (`POST /orders/quote`).
 *
 * - `postalCode` → CEP de destino (o CEP de origem vem da config `MELHOR_ENVIO_FROM_POSTAL_CODE`).
 * - `quantity`   → quantidade do pingente (default 1).
 */
export const quoteOrderSchema = z.object({
  postalCode: z.string().trim().min(8).max(9),
  quantity: z.coerce.number().int().min(1).max(10).default(1),
})

export type QuoteOrderDto = z.infer<typeof quoteOrderSchema>
