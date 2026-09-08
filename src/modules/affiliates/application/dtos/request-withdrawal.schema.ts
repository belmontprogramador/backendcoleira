import { z } from 'zod'

export const requestWithdrawalSchema = z.object({
  amountCents: z.number().int().min(1),
})

export type RequestWithdrawalDto = z.infer<typeof requestWithdrawalSchema>
