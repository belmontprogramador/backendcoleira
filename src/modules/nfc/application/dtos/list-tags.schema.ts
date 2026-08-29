import { z } from 'zod'

export const listTagsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().optional(),
  batchId: z.string().optional(),
})

export type ListTagsDto = z.infer<typeof listTagsSchema>
