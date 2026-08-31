import { z } from 'zod'

/**
 * Campos editáveis de um plano pelo painel admin (opção A):
 * somente `name`, `description` e `priceCents`.
 *
 * `code` e `interval`/`intervalCount` são imutáveis por esta rota (regra de
 * negócio — periodicidade travada em mensal por enquanto).
 */
export const updatePlanSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    description: z.string().trim().max(500).nullable().optional(),
    priceCents: z.number().int().min(0).optional(),
  })
  .refine(
    d =>
      d.name !== undefined ||
      d.description !== undefined ||
      d.priceCents !== undefined,
    { message: 'Informe ao menos um campo para atualizar' },
  )

export type UpdatePlanDto = z.infer<typeof updatePlanSchema>
