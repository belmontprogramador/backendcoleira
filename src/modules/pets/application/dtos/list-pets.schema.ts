import { z } from 'zod'

export const listPetsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  ownerId: z.string().min(1).optional(),
})

export type ListPetsDto = z.infer<typeof listPetsSchema>
