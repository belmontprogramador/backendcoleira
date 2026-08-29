import { z } from 'zod'

/**
 * Query params do inbox do tutor: `GET /contacts`.
 * `petId` é opcional — sem ele, lista o inbox geral (todos os pets do ator).
 */
export const listContactsSchema = z.object({
  petId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type ListContactsDto = z.infer<typeof listContactsSchema>
