import { z } from 'zod'

export const createBatchSchema = z.object({
  name: z.string().min(1).max(100),
  quantity: z.number().int().min(1).max(100000),
  description: z.string().max(500).optional(),
  prefix: z.string().max(20).optional(),
  externalRef: z.string().max(100).optional(),
})

export type CreateBatchDto = z.infer<typeof createBatchSchema>
