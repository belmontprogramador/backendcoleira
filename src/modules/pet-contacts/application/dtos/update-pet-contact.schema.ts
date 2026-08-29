import { z } from 'zod'

/**
 * Corpo do `PATCH /pets/:petId/contacts/:id`. Todos os campos opcionais;
 * `null` limpa phone/email/relationship.
 */
export const updatePetContactSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  phone: z.string().trim().max(50).nullable().optional(),
  email: z.string().trim().email().max(200).nullable().optional(),
  relationship: z.string().trim().max(100).nullable().optional(),
  isPrimary: z.boolean().optional(),
})

export type UpdatePetContactDto = z.infer<typeof updatePetContactSchema>
