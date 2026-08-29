import { z } from 'zod'

export const cancelBatchSchema = z.object({
  reason: z.string().min(1).max(500),
})

export type CancelBatchDto = z.infer<typeof cancelBatchSchema>
