import { z } from 'zod'

export const requestTransferSchema = z.object({
  toEmail: z.string().email(),
})

export type RequestTransferDto = z.infer<typeof requestTransferSchema>
