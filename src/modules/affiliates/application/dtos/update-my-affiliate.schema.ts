import { z } from 'zod'

/**
 * Campos editáveis pelo próprio afiliado (self). Não inclui comissão, piso,
 * status nem code — esses são exclusivos do admin.
 */
export const updateMyAffiliateSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    phone: z.string().trim().max(20).nullable().optional(),
    document: z.string().trim().max(20).nullable().optional(),
    pixKey: z.string().trim().max(200).nullable().optional(),
    bankName: z.string().trim().max(100).nullable().optional(),
    bankAgency: z.string().trim().max(20).nullable().optional(),
    bankAccount: z.string().trim().max(20).nullable().optional(),
  })
  .refine(d => Object.keys(d).length > 0, {
    message: 'Informe ao menos um campo para atualizar',
  })

export type UpdateMyAffiliateDto = z.infer<typeof updateMyAffiliateSchema>
