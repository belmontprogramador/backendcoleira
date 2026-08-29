import { z } from 'zod'

export const associatePetSchema = z.object({
  petId: z.string().min(1),
})

export type AssociatePetDto = z.infer<typeof associatePetSchema>
