import { z } from 'zod'

export const listAffiliatesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  search: z.string().trim().optional(),
})

export type ListAffiliatesDto = z.infer<typeof listAffiliatesSchema>
