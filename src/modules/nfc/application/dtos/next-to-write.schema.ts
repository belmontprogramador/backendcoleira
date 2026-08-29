import { z } from 'zod'

export const nextToWriteSchema = z.object({
  batchId: z.string().optional(),
})

export type NextToWriteDto = z.infer<typeof nextToWriteSchema>
