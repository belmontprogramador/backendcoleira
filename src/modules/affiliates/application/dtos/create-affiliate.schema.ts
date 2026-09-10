import { z } from 'zod'
import { AFFILIATE_CODE_PATTERN } from '../../domain/entities/affiliate.entity'

export const COMMISSION_TYPE_VALUES = [
  'FIXED',
  'PERCENTAGE',
  'FIXED_PLUS_PERCENTAGE',
] as const

const commissionTypeEnum = z.enum(COMMISSION_TYPE_VALUES)

/**
 * Corpo de criação de um afiliado pelo admin.
 * `code` é o referral code definido pelo admin (slug único).
 *
 * A comissão é configurada de forma independente para a venda do pingente
 * (`saleCommission*`) e para cada ciclo pago de assinatura
 * (`subscriptionCommission*`).
 */
export const createAffiliateSchema = z.object({
  code: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      AFFILIATE_CODE_PATTERN,
      'Código inválido (3-32 chars: letras minúsculas, números e hífen)',
    ),
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(20).nullable().optional(),
  document: z.string().trim().max(20).nullable().optional(),
  pixKey: z.string().trim().max(200).nullable().optional(),
  bankName: z.string().trim().max(100).nullable().optional(),
  bankAgency: z.string().trim().max(20).nullable().optional(),
  bankAccount: z.string().trim().max(20).nullable().optional(),
  saleCommissionType: commissionTypeEnum.default('PERCENTAGE'),
  saleCommissionFixedCents: z.number().int().min(0).default(0),
  saleCommissionPercentBps: z.number().int().min(0).default(0),
  subscriptionCommissionType: commissionTypeEnum.default('PERCENTAGE'),
  subscriptionCommissionFixedCents: z.number().int().min(0).default(0),
  subscriptionCommissionPercentBps: z.number().int().min(0).default(0),
  minWithdrawalCents: z.number().int().min(0).default(0),
})

export type CreateAffiliateDto = z.infer<typeof createAffiliateSchema>
