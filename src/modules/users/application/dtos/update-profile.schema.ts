import { z } from 'zod'
import { brPhoneSchema } from '../../../../common/utils/phone'

export const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  phone: brPhoneSchema.optional(),
})

export type UpdateProfileDto = z.infer<typeof updateProfileSchema>
