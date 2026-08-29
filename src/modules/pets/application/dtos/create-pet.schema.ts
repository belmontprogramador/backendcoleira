import { z } from 'zod'

export const createPetSchema = z.object({
  name: z.string().min(1).max(50),
  species: z.string().min(1).max(30),
  breed: z.string().max(30).optional(),
  sex: z.enum(['MALE', 'FEMALE', 'UNKNOWN']).optional(),
  birthDate: z.string().datetime().optional(),
  description: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
})

export type CreatePetDto = z.infer<typeof createPetSchema>
