import { z } from 'zod'

export const acceptTransferSchema = z.object({
  token: z.string().min(1),
})

export type AcceptTransferDto = z.infer<typeof acceptTransferSchema>
