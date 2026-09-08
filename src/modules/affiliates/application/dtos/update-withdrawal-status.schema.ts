import { z } from 'zod'

export const updateWithdrawalStatusSchema = z.object({
  status: z.enum(['PROCESSING', 'PAID', 'REJECTED']),
})

export type UpdateWithdrawalStatusDto = z.infer<
  typeof updateWithdrawalStatusSchema
>
