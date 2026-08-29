import { z } from 'zod'

export const lostStatusSchema = z.object({
  lost: z.boolean(),
})

export type LostStatusDto = z.infer<typeof lostStatusSchema>
