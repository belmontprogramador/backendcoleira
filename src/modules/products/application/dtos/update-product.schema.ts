import { z } from 'zod'

/**
 * Campos editáveis de um produto pelo painel admin:
 * `name`, `description`, `priceCents` e `active`.
 *
 * `sku` é imutável por esta rota (identificador de negócio).
 */
export const updateProductSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(500).nullable().optional(),
    priceCents: z.number().int().min(0).optional(),
    active: z.boolean().optional(),
  })
  .refine(
    d =>
      d.name !== undefined ||
      d.description !== undefined ||
      d.priceCents !== undefined ||
      d.active !== undefined,
    { message: 'Informe ao menos um campo para atualizar' },
  )

export type UpdateProductDto = z.infer<typeof updateProductSchema>
