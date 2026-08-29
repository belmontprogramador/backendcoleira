import { z } from 'zod'

export const updateUserStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'BLOCKED']),
})

export type UpdateUserStatusDto = z.infer<typeof updateUserStatusSchema>
