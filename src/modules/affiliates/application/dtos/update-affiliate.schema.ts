import { z } from 'zod'
import { COMMISSION_TYPE_VALUES } from './create-affiliate.schema'

const commissionTypeEnum = z.enum(COMMISSION_TYPE_VALUES)

/**
 * Campos editáveis de um afiliado pelo admin. `code` é imutável.
 * A comissão é editável de forma independente para venda e assinatura.
 */
export const updateAffiliateSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    email: z.string().trim().email().max(200).optional(),
    phone: z.string().trim().max(20).nullable().optional(),
    document: z.string().trim().max(20).nullable().optional(),
    pixKey: z.string().trim().max(200).nullable().optional(),
    bankName: z.string().trim().max(100).nullable().optional(),
    bankAgency: z.string().trim().max(20).nullable().optional(),
    bankAccount: z.string().trim().max(20).nullable().optional(),
    saleCommissionType: commissionTypeEnum.optional(),
    saleCommissionFixedCents: z.number().int().min(0).optional(),
    saleCommissionPercentBps: z.number().int().min(0).optional(),
    subscriptionCommissionType: commissionTypeEnum.optional(),
    subscriptionCommissionFixedCents: z.number().int().min(0).optional(),
    subscriptionCommissionPercentBps: z.number().int().min(0).optional(),
    minWithdrawalCents: z.number().int().min(0).optional(),
  })
  .refine(d => Object.keys(d).length > 0, {
    message: 'Informe ao menos um campo para atualizar',
  })

export type UpdateAffiliateDto = z.infer<typeof updateAffiliateSchema>
