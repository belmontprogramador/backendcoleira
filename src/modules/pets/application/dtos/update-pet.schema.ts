import { z } from 'zod'

export const updatePetSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  species: z.string().min(1).max(30).optional(),
  breed: z.string().max(30).optional().nullable(),
  sex: z.enum(['MALE', 'FEMALE', 'UNKNOWN']).optional().nullable(),
  birthDate: z.string().datetime().optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
})

export type UpdatePetDto = z.infer<typeof updatePetSchema>
