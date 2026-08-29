import { z } from 'zod'

export const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().nullable().optional(),
})

export type UpdateProfileDto = z.infer<typeof updateProfileSchema>
