import { z } from 'zod'

export const listWithdrawalsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['RECEIVED', 'PROCESSING', 'PAID', 'REJECTED']).optional(),
  affiliateId: z.string().optional(),
})

export type ListWithdrawalsDto = z.infer<typeof listWithdrawalsSchema>
