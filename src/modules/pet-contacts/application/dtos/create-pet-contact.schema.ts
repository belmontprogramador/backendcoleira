import { z } from 'zod'

/**
 * Corpo do `POST /pets/:petId/contacts`. `name` é obrigatório.
 */
export const createPetContactSchema = z.object({
  name: z.string().trim().min(1).max(100),
  phone: z.string().trim().max(50).nullable().optional(),
  email: z.string().trim().email().max(200).nullable().optional(),
  relationship: z.string().trim().max(100).nullable().optional(),
  isPrimary: z.boolean().optional(),
})

export type CreatePetContactDto = z.infer<typeof createPetContactSchema>
